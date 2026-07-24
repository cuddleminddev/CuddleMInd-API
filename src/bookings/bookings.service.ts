import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {
  Booking,
  BookingStatus,
  PaymentType,
  SessionStatusEnum,
  SessionType,
} from '@prisma/client';
import dayjs from 'dayjs';
import { GetTimeSlotsDto } from './dto/get-time-slots.dto';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { StripeService } from 'src/stripe/stripe.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { MailService } from 'src/mailer/mailer.service';

dayjs.extend(utc);
dayjs.extend(timezone);

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => StripeService))
    private stripeService: StripeService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
  ) { }

  private async getBookingSettings() {
    const setting = await this.prisma.bookingSetting.upsert({
      where: { settingKey: 'default' },
      update: {},
      create: { settingKey: 'default' },
      select: {
        bookingDurationMinutes: true,
        bookingCharge: true,
      },
    });

    return {
      durationMinutes: setting.bookingDurationMinutes,
      amount: Number(setting.bookingCharge),
    };
  }

  async sendDoctorBookingStatusEmail(
    bookingId: string,
    status: 'pending' | 'confirmed' | 'cancelled',
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        doctor: { select: { name: true, email: true } },
        patient: { select: { name: true, email: true } },
      },
    });

    if (!booking?.doctor?.email || !booking?.patient?.name) {
      return;
    }

    const bookingSettings = await this.getBookingSettings();

    const result = await this.mailService.sendDoctorBookingStatusEmail({
      to: booking.doctor.email,
      doctorName: booking.doctor.name,
      patientName: booking.patient.name,
      scheduledAt: booking.scheduledAt,
      sessionType: booking.sessionType,
      durationMinutes: bookingSettings.durationMinutes,
      amount: Number(booking.amount || bookingSettings.amount),
      status,
    });

    if (!result?.success) {
      console.warn(
        `⚠️ [mail] Failed to send doctor booking ${status} email for booking ${bookingId}: ${result?.error ?? 'unknown error'}`,
      );
    }
  }

  // Create booking with plan or one-time payment
  async create(dto: CreateBookingDto, clientId: string) {
    const { type, scheduledAt, doctorId, paymentType, sessionType } = dto;
    const patientId = clientId;

    console.log('➡️ Booking DTO:', dto);

    if (!scheduledAt || !dayjs(scheduledAt).isValid()) {
      console.error('❌ Invalid scheduledAt date:', scheduledAt);
      throw new BadRequestException('Invalid scheduledAt date');
    }

    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
      include: { role: true },
    });

    console.log('👤 Client fetched:', client);

    if (!client || client.role.name.toLowerCase() !== 'client') {
      console.warn('⚠️ Forbidden access by non-client user:', clientId);
      throw new ForbiddenException('Only clients can create bookings');
    }

    const activePlans = await this.prisma.userPlan.findMany({
      where: { patientId: clientId, isActive: true },
      include: { package: true },
    });

    console.log('📦 Active Plans:', activePlans);

    const bookingSettings = await this.getBookingSettings();
    const consultationCharge = bookingSettings.amount;
    const durationMinutes = bookingSettings.durationMinutes;

    const assignedDoctorId =
      doctorId ||
      (await this.assignAvailableDoctor(new Date(scheduledAt), durationMinutes));

    console.log('👨‍⚕️ Assigned Doctor ID:', assignedDoctorId);

    console.log('💰 Consultation Charge:', consultationCharge);
    console.log('⏱️ Booking Duration Minutes:', durationMinutes);

    let booking: Booking;

    if (paymentType === PaymentType.one_time) {
      console.log('🧾 Creating one-time payment booking...');
      booking = await this.prisma.booking.create({
        data: {
          doctorId: assignedDoctorId,
          patientId,
          scheduledAt: new Date(scheduledAt),
          type,
          paymentType,
          isPaid: false,
          userPlanId: null,
          amount: consultationCharge,
          status: BookingStatus.pending,
          sessionType,
        },
        include: { doctor: true },
      });

      console.log('📘 Booking created:', booking);

      const paymentOrder = await this.stripeService.createPaymentIntent(
        patientId,
        Number(consultationCharge),
        PaymentType.one_time,
        {
          patientId,
          doctorId: assignedDoctorId,
          bookingId: booking.id,
        },
      );

      console.log('💳 Razorpay order created:', paymentOrder);

      // Doctor will be marked unavailable only when booking is confirmed via webhook

      return {
        booking,
        paymentOrder,
        message: 'Booking created. Complete payment via Razorpay on frontend.',
      };
    }

    if (paymentType === PaymentType.plan) {
      // If caller specifies a userPlanId, use that exact plan.
      // Otherwise fall back to the first active plan with remaining bookings.
      const { userPlanId: requestedPlanId } = dto;

      let selectedPlan = requestedPlanId
        ? activePlans.find((p) => p.id === requestedPlanId)
        : activePlans.find((p) => p.bookingsPending > 0);

      if (requestedPlanId && !selectedPlan) {
        // May not be in activePlans cache if it was just activated — fetch directly
        const directPlan = await this.prisma.userPlan.findFirst({
          where: {
            id: requestedPlanId,
            patientId: clientId,
            isActive: true,
            endDate: { gte: new Date() },
          },
          include: { package: true },
        });
        if (!directPlan) {
          throw new BadRequestException(
            'The specified subscription plan is not valid or does not belong to you.',
          );
        }
        selectedPlan = directPlan as any;
      }

      if (selectedPlan && selectedPlan.bookingsPending <= 0) {
        throw new BadRequestException(
          'The selected subscription has no bookings remaining.',
        );
      }

      if (!selectedPlan) {
        console.warn(
          '⚠️ No plan with available bookings found for client:',
          clientId,
        );

        // If the caller provided a packageId, auto-create a Razorpay order
        // AND create the booking immediately (pending) so it gets confirmed
        // automatically by the webhook on payment — no retry needed.
        const { packageId } = dto;
        if (packageId) {
          const planPackage = await this.prisma.planPackage.findUnique({
            where: { id: packageId },
          });

          if (!planPackage || !planPackage.isActive) {
            throw new BadRequestException(
              'Plan not found or inactive. Please choose a valid plan.',
            );
          }

          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + planPackage.timePeriod);

          // Create inactive UserPlan — activated by webhook on payment
          const userPlan = await this.prisma.userPlan.create({
            data: {
              patientId,
              packageId,
              bookingsPending: planPackage.bookingFrequency,
              startDate,
              endDate,
              isActive: false,
            },
          });

          // Create the booking immediately (pending) so the webhook confirms it
          const pendingBooking = await this.prisma.booking.create({
            data: {
              doctorId: assignedDoctorId,
              patientId,
              scheduledAt: new Date(scheduledAt),
              type,
              paymentType,
              isPaid: false,
              userPlanId: userPlan.id,
              amount: consultationCharge,
              status: BookingStatus.pending,
              sessionType,
            },
            include: { doctor: true },
          });

          // Doctor will be marked unavailable only when booking is confirmed via webhook

          const paymentOrder = await this.stripeService.createPaymentIntent(
            patientId,
            Number(planPackage.amount),
            PaymentType.plan,
            {
              packageId,
              userId: patientId,
              userPlanId: userPlan.id,
              bookingId: pendingBooking.id, // ← webhook uses this to confirm booking
              type: 'plan',
            },
          );

          return {
            requiresPlanPurchase: true,
            message:
              'No active plan available. Complete the plan payment — your booking will be confirmed automatically.',
            booking: pendingBooking,
            paymentOrder,
            plan: {
              id: planPackage.id,
              name: planPackage.name,
              amount: planPackage.amount,
              bookingFrequency: planPackage.bookingFrequency,
              timePeriod: planPackage.timePeriod,
            },
          };
        }

        throw new BadRequestException(
          'No active plan with available bookings. Please provide a packageId to purchase a new plan.',
        );
      }

      console.log('📦 Using plan:', selectedPlan);

      booking = await this.prisma.booking.create({
        data: {
          doctorId: assignedDoctorId,
          patientId,
          scheduledAt: new Date(scheduledAt),
          type,
          paymentType,
          isPaid: true,
          userPlanId: selectedPlan.id,
          amount: consultationCharge,
          status: BookingStatus.confirmed,
          sessionType,
        },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              email: true,
              // add more doctor fields as needed
            },
          },
        },
      });

      console.log('📘 Booking (plan) created:', booking);

      await this.prisma.userPlan.update({
        where: { id: selectedPlan.id },
        data: { bookingsPending: { decrement: 1 } },
      });

      console.log('📉 Decremented plan usage for:', selectedPlan.id);

      await this.markDoctorUnavailable(
        assignedDoctorId,
        new Date(scheduledAt),
        durationMinutes,
      );

      await this.prisma.consultationSession.create({
        data: {
          bookingId: booking.id,
          date: new Date(scheduledAt),
          status: 'pending',
          sessionType,
          durationInMinutes: durationMinutes,
        },
      });

      console.log('🗓️ Consultation session created for booking:', booking.id);

      await this.sendDoctorBookingStatusEmail(booking.id, 'confirmed');

      // 🔔 Notify doctor about the new booking (fire-and-forget)
      this.notificationsService
        .notifyDoctorNewBooking(
          assignedDoctorId,
          client.name,
          new Date(scheduledAt),
          booking.id,
        )
        .catch((err) =>
          console.warn('⚠️ [notify] Failed to send doctor booking notification:', err.message),
        );

      return booking;
    }

    console.error('❌ Invalid payment type:', paymentType);
    throw new BadRequestException('Invalid payment type');
  }

  // Fetch all bookings with relations
  async findAll(filter?: {
    patientId?: string;
    doctorId?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
  }) {
    const { patientId, doctorId, fromDate, toDate, status } = filter || {};
    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    
    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'pending' };
    }

    if (fromDate || toDate) {
      const scheduledAt: any = {};

      if (fromDate) {
        const from = new Date(fromDate);
        if (!isNaN(from.getTime())) {
          from.setHours(0, 0, 0, 0); // Start of day
          scheduledAt.gte = from;
        }
      }

      if (toDate) {
        const to = new Date(toDate);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999); // End of day
          scheduledAt.lte = to;
        }
      }

      if (Object.keys(scheduledAt).length > 0) {
        where.scheduledAt = scheduledAt;
      }
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        doctor: true,
        patient: true,
        userPlan: {
          include: { package: true },
        },
        transaction: true,
      },
    });
  }

  // Find one booking with relations
  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        doctor: true,
        patient: true,
        userPlan: {
          include: { package: true },
        },
        transaction: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  // Update booking data
  async update(id: string, dto: UpdateBookingDto) {
    const currentBooking = await this.findOne(id);

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        ...(dto.doctorId && { doctorId: dto.doctorId }),
        ...(dto.patientId && { patientId: dto.patientId }),
        ...(dto.userPlanId && { userPlanId: dto.userPlanId }),
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.type && { type: dto.type }),
        ...(dto.status && { status: dto.status }),
        ...(dto.isPaid !== undefined && { isPaid: dto.isPaid }),
        ...(dto.paymentType && { paymentType: dto.paymentType }),
      },
    });

    if (
      dto.status === BookingStatus.confirmed &&
      currentBooking.status !== BookingStatus.confirmed
    ) {
      await this.sendDoctorBookingStatusEmail(id, 'confirmed');
    }

    if (
      dto.status === BookingStatus.cancelled &&
      currentBooking.status !== BookingStatus.cancelled
    ) {
      await this.sendDoctorBookingStatusEmail(id, 'cancelled');
    }

    return updatedBooking;
  }

  // Delete booking
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.booking.delete({ where: { id } });
  }

  // Find a doctor available at a given scheduledAt datetime
  // Assign available doctor
  async assignAvailableDoctor(
    scheduledAt: Date,
    durationMinutes?: number,
  ): Promise<string> {
    const bookingSettings = durationMinutes
      ? null
      : await this.getBookingSettings();
    const effectiveDurationMinutes = durationMinutes ?? bookingSettings!.durationMinutes;

    const scheduledStart = dayjs(scheduledAt).utc();
    const scheduledEnd = scheduledStart.add(effectiveDurationMinutes, 'minute');
    const dayOfWeek = scheduledStart.day();

    const scheduledTimeStart = new Date(
      Date.UTC(1970, 0, 1, scheduledStart.hour(), scheduledStart.minute()),
    );
    const scheduledTimeEnd = new Date(
      Date.UTC(1970, 0, 1, scheduledEnd.hour(), scheduledEnd.minute()),
    );

    // Start of the overlap window: any booking that started within
    // (scheduledStart - sessionDuration, scheduledEnd) would overlap with
    // the requested slot.  Using "gte scheduledStart - duration" means a
    // back-to-back booking (ends exactly at scheduledStart) is allowed.
    const overlapWindowStart = scheduledStart
      .subtract(effectiveDurationMinutes, 'minute')
      .add(1, 'millisecond')
      .toDate();

    console.log('🕒 Finding doctor for:', scheduledStart.toISOString());

    return this.prisma.$transaction(async (tx) => {
      const availableDoctor = await tx.user.findFirst({
        where: {
          role: { name: 'doctor' },
          status: 'active',
          bookingsAsDoctor: {
            none: {
              // Exclude doctors who already have a pending OR confirmed booking
              // that overlaps this slot. Without this, the same doctor could be
              // assigned to two different users for the same time slot.
              scheduledAt: {
                gte: overlapWindowStart,
                lt: scheduledEnd.toDate(),
              },
              status: { in: ['pending', 'confirmed'] },
            },
          },
          doctorUnavailabilities: {
            none: {
              startTime: { lte: scheduledStart.toDate() },
              endTime: { gt: scheduledStart.toDate() },
            },
          },
          timeslots: {
            some: {
              dayOfWeek,
              isRecurring: true,
              startTime: { lte: scheduledTimeStart },
              endTime: { gte: scheduledTimeEnd },
            },
          },
        },
        orderBy: [
          { bookingQueueOrder: 'asc' },
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
        select: {
          id: true,
          bookingQueueOrder: true,
        },
      });

      console.log('🔍 Available doctor selected for queue:', availableDoctor);

      if (!availableDoctor) {
        console.warn('⚠️ No available doctor for:', scheduledStart.toISOString());
        throw new BadRequestException('No doctors available at this time slot');
      }

      const queueStats = await tx.user.aggregate({
        where: {
          role: { name: 'doctor' },
          status: 'active',
        },
        _max: {
          bookingQueueOrder: true,
        },
      });

      const nextQueueOrder = (queueStats._max.bookingQueueOrder ?? 0) + 1;

      await tx.user.update({
        where: { id: availableDoctor.id },
        data: { bookingQueueOrder: nextQueueOrder },
      });

      return availableDoctor.id;
    });
  }

  // Mark unavailability
  async markDoctorUnavailable(
    doctorId: string,
    scheduledAt: Date,
    durationMinutes?: number,
  ) {
    const bookingSettings = durationMinutes
      ? null
      : await this.getBookingSettings();
    const effectiveDurationMinutes = durationMinutes ?? bookingSettings!.durationMinutes;

    const slotStart = dayjs(scheduledAt).utc();
    const slotEnd = slotStart.add(effectiveDurationMinutes, 'minute');

    console.log('🛑 Marking unavailable:', {
      doctorId,
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
    });

    const existingBlock = await this.prisma.doctorUnavailability.findFirst({
      where: {
        doctorId,
        startTime: slotStart.toDate(),
        endTime: slotEnd.toDate(),
      },
    });

    if (existingBlock) {
      console.log('⚠️ Unavailability already exists:', existingBlock);
      return;
    }

    const created = await this.prisma.doctorUnavailability.create({
      data: {
        doctorId,
        date: slotStart.utc().startOf('day').toDate(),
        startTime: slotStart.toDate(),
        endTime: slotEnd.toDate(),
        reason: 'Booked session',
      },
    });

    console.log('✅ Doctor marked unavailable:', created);
  }

  async createConsultationSession(booking: Booking) {
    const bookingSettings = await this.getBookingSettings();

    await this.prisma.consultationSession.upsert({
      where: { bookingId: booking.id },
      update: {
        zegocloudRoomId: `zego-${booking.id}`,
      },
      create: {
        bookingId: booking.id,
        date: booking.scheduledAt,
        status: SessionStatusEnum.pending,
        sessionType: booking.sessionType,
        durationInMinutes: bookingSettings.durationMinutes,
        zegocloudRoomId: `zego-${booking.id}`,
      },
    });
  }

  async getNextBooking(userId: string, role: 'doctor' | 'client') {
    const whereClause =
      role === 'doctor' ? { doctorId: userId } : { patientId: userId };

    const booking = await this.prisma.booking.findFirst({
      where: {
        ...whereClause,
        scheduledAt: { gte: new Date() },
        status: { in: ['confirmed'] },
      },
      include: {
        doctor: true,
        patient: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    if (!booking) {
      throw new NotFoundException('No upcoming bookings found');
    }

    return {
      status: true,
      message: 'Next booking fetched',
      data: booking,
    };
  }

  async getUpcomingBookingsForDoctor(doctorId: string) {
    return this.prisma.booking.findMany({
      where: {
        doctorId,
        status: 'confirmed',
        scheduledAt: { gt: new Date() },
      },
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        createdAt: true,
        updatedAt: true,
        scheduledAt: true,
        isPaid: true,
        paymentType: true,
        sessionType: true,
        patientId: true,
        doctorId: true,
        userPlanId: true,
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        consultationSession: {
          select: {
            id: true,
            status: true,
            date: true,
            startedAt: true,
            endedAt: true,
            notes: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });
  }
}
