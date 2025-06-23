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

dayjs.extend(utc);
dayjs.extend(timezone);

const SESSION_DURATION_MS = 60 * 60 * 1000;

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => StripeService))
    private stripeService: StripeService,
  ) {}

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

    const assignedDoctorId =
      doctorId || (await this.assignAvailableDoctor(new Date(scheduledAt)));

    console.log('👨‍⚕️ Assigned Doctor ID:', assignedDoctorId);

    const consultationCharge = await this.getConsultationCharge(
      assignedDoctorId,
      sessionType,
    );

    console.log('💰 Consultation Charge:', consultationCharge);

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

      const paymentIntent = await this.stripeService.createPaymentIntent(
        patientId,
        Number(consultationCharge),
        PaymentType.one_time,
        {
          patientId,
          doctorId: assignedDoctorId,
          bookingId: booking.id,
        },
      );

      console.log('💳 Stripe payment intent:', paymentIntent);

      await this.markDoctorUnavailable(assignedDoctorId, new Date(scheduledAt));

      return {
        booking,
        paymentIntent,
        message: 'Booking created. Confirm payment on frontend.',
      };
    }

    if (paymentType === PaymentType.plan) {
      const selectedPlan = activePlans.find((p) => p.bookingsPending > 0);

      if (!selectedPlan) {
        console.warn(
          '⚠️ No plan with available bookings found for client:',
          clientId,
        );
        throw new BadRequestException('Plan usage limit reached');
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

      await this.markDoctorUnavailable(assignedDoctorId, new Date(scheduledAt));

      await this.prisma.consultationSession.create({
        data: {
          bookingId: booking.id,
          date: new Date(scheduledAt),
          status: 'pending',
          sessionType,
        },
      });

      console.log('🗓️ Consultation session created for booking:', booking.id);

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
  }) {
    const { patientId, doctorId, fromDate, toDate } = filter || {};
    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;

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
    await this.findOne(id);

    return this.prisma.booking.update({
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
  }

  // Delete booking
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.booking.delete({ where: { id } });
  }

  // Get consultation charge for a doctor and session type
  async getConsultationCharge(
    doctorId: string,
    type: SessionType,
  ): Promise<number> {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { doctorId },
    });

    if (!profile) {
      // default charges if profile missing
      if (type === SessionType.audio) return 100;
      if (type === SessionType.video) return 200;
      return 0;
    }

    if (type === SessionType.audio)
      return Number(profile.audioConsultationCharge);
    if (type === SessionType.video)
      return Number(profile.videoConsultationCharge);
    return 0;
  }

  // Find a doctor available at a given scheduledAt datetime
  // Assign available doctor
  async assignAvailableDoctor(scheduledAt: Date): Promise<string> {
    const scheduledStart = dayjs(scheduledAt).utc();
    const scheduledEnd = scheduledStart.add(30, 'minute');
    const dayOfWeek = scheduledStart.day();

    const scheduledTimeStart = new Date(
      Date.UTC(1970, 0, 1, scheduledStart.hour(), scheduledStart.minute()),
    );
    const scheduledTimeEnd = new Date(
      Date.UTC(1970, 0, 1, scheduledEnd.hour(), scheduledEnd.minute()),
    );

    console.log('🕒 Finding doctor for:', scheduledStart.toISOString());

    const doctors = await this.prisma.user.findMany({
      where: {
        role: { name: 'doctor' },
        bookingsAsDoctor: {
          none: {
            scheduledAt: {
              gte: scheduledStart.toDate(),
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
      take: 1,
    });

    console.log('🔍 Available doctors:', doctors);

    const availableDoctor = doctors[0];

    if (!availableDoctor) {
      console.warn('⚠️ No available doctor for:', scheduledStart.toISOString());
      throw new BadRequestException('No doctors available at this time slot');
    }

    return availableDoctor.id;
  }

  // Mark unavailability
  async markDoctorUnavailable(doctorId: string, scheduledAt: Date) {
    const slotStart = dayjs(scheduledAt);
    const slotEnd = slotStart.add(30, 'minute');

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
        date: slotStart.startOf('day').toDate(),
        startTime: slotStart.toDate(),
        endTime: slotEnd.toDate(),
        reason: 'Booked session',
      },
    });

    console.log('✅ Doctor marked unavailable:', created);
  }

  async createConsultationSession(booking: Booking) {
    await this.prisma.consultationSession.create({
      data: {
        bookingId: booking.id,
        date: booking.scheduledAt,
        status: SessionStatusEnum.pending,
        sessionType: booking.sessionType,
      },
    });
  }

  async getUpcomingBookingsForDoctor(doctorId: string) {
    return this.prisma.booking.findMany({
      where: {
        doctorId,
        status: 'confirmed',
        scheduledAt: { gt: new Date() },
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        consultationSession: true,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });
  }
}
