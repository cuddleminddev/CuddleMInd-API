import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PaymentsService } from 'src/payments/payments.service';
import { BookingStatus, PaymentType, SessionType } from '@prisma/client';
import dayjs from 'dayjs';
import { GetTimeSlotsDto } from './dto/get-time-slots.dto';
import isBetween from 'dayjs/plugin/isBetween';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  // Create booking with plan or one-time payment
  async create(dto: CreateBookingDto) {
    const { type, scheduledAt, doctorId, paymentType, userPlanId, patientId } =
      dto;

    // Validate scheduledAt is a valid date
    if (!scheduledAt || !dayjs(scheduledAt).isValid()) {
      throw new BadRequestException('Invalid scheduledAt date');
    }

    // 1. Determine consultation charge for doctor or default
    const assignedDoctorId =
      doctorId || (await this.assignAvailableDoctor(new Date(scheduledAt)));

    const consultationCharge = await this.getConsultationCharge(
      assignedDoctorId,
      type,
    );

    if (paymentType === PaymentType.one_time) {
      // Create payment intent for one-time
      const paymentIntent = await this.paymentsService.createPaymentIntent({
        amount: Number(consultationCharge) * 100, // in paise for INR
        currency: 'inr',
        metadata: { patientId, doctorId: assignedDoctorId },
      });

      return {
        paymentIntent,
        message: 'Payment intent created. Confirm it on frontend.',
      };
    }

    if (paymentType === PaymentType.plan) {
      if (!userPlanId) {
        throw new BadRequestException(
          'userPlanId is required for plan payment',
        );
      }

      // Fetch user plan including package for frequency
      const plan = await this.prisma.userPlan.findUnique({
        where: { id: userPlanId },
        include: { package: true },
      });

      if (!plan || !plan.isActive) {
        throw new BadRequestException('Invalid or inactive plan');
      }

      // Enforce usage limit - count bookings pending or confirmed in plan
      const remainingUses = plan.bookingsPending; // based on schema, userPlan has bookingsPending

      if (remainingUses <= 0) {
        throw new BadRequestException('Plan usage limit reached');
      }

      // Enforce booking frequency (bookingFrequency from PlanPackage)
      const frequencyInDays = plan.package.bookingFrequency;

      // Find last confirmed booking under this plan for patient
      const lastBooking = await this.prisma.booking.findFirst({
        where: {
          patientId,
          userPlanId,
          status: BookingStatus.confirmed,
        },
        orderBy: { scheduledAt: 'desc' },
      });

      if (lastBooking) {
        const nextAllowedDate = dayjs(lastBooking.scheduledAt).add(
          frequencyInDays,
          'day',
        );
        if (dayjs(scheduledAt).isBefore(nextAllowedDate)) {
          throw new BadRequestException(
            `You can only book after ${nextAllowedDate.format('YYYY-MM-DD')}`,
          );
        }
      }

      // Create booking
      const booking = await this.prisma.booking.create({
        data: {
          doctorId: assignedDoctorId,
          patientId,
          scheduledAt: new Date(scheduledAt),
          type: type,
          paymentType,
          isPaid: true,
          userPlanId,
          amount: consultationCharge,
          status: BookingStatus.confirmed,
        },
      });

      // Decrement bookingsPending in UserPlan
      await this.prisma.userPlan.update({
        where: { id: userPlanId },
        data: { bookingsPending: { decrement: 1 } },
      });

      // Block doctor's availability
      await this.markDoctorUnavailable(assignedDoctorId, new Date(scheduledAt));

      return booking;
    }

    throw new BadRequestException('Invalid payment type');
  }

  // Fetch all bookings with relations
  async findAll(filter?: { patientId?: string; doctorId?: string }) {
    return this.prisma.booking.findMany({
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

  // Get available time slots for doctor on a given date
  async getAvailableTimeSlots(
    dto: GetTimeSlotsDto,
  ): Promise<{ time: string; isAvailable: boolean }[]> {
    const date = dayjs(dto.date || new Date()).startOf('day');
    const startHour = 9;
    const endHour = 18;
    const slotMinutes = 30;

    // Generate all slots
    const allSlots: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += slotMinutes) {
        allSlots.push(
          `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        );
      }
    }

    if (!dto.doctorId) {
      return allSlots.map((time) => ({ time, isAvailable: true }));
    }

    // Find booked slots by existing bookings with confirmed or pending status
    const bookings = await this.prisma.booking.findMany({
      where: {
        doctorId: dto.doctorId,
        scheduledAt: {
          gte: date.toDate(),
          lt: date.endOf('day').toDate(),
        },
        status: { in: [BookingStatus.confirmed, BookingStatus.pending] },
      },
      select: { scheduledAt: true },
    });

    // Find doctor unavailability ranges for that date
    const unavailabilities = await this.prisma.doctorUnavailability.findMany({
      where: {
        doctorId: dto.doctorId,
        date: date.toDate(),
      },
    });

    const bookedTimes = bookings.map((b) =>
      dayjs(b.scheduledAt).format('HH:mm'),
    );

    return allSlots.map((time) => {
      const slotDateTime = date
        .hour(Number(time.split(':')[0]))
        .minute(Number(time.split(':')[1]))
        .second(0);

      // Check if time slot is within any unavailability range
      const isBlocked = unavailabilities.some((u) =>
        slotDateTime.isBetween(
          dayjs(u.startTime),
          dayjs(u.endTime),
          null,
          '[)',
        ),
      );

      return {
        time,
        isAvailable: !bookedTimes.includes(time) && !isBlocked,
      };
    });
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
      if (type === SessionType.audio) return 300;
      if (type === SessionType.video) return 500;
      return 0;
    }

    if (type === SessionType.audio)
      return Number(profile.audioConsultationCharge);
    if (type === SessionType.video)
      return Number(profile.videoConsultationCharge);
    return 0;
  }

  // Find a doctor available at a given scheduledAt datetime
  async assignAvailableDoctor(scheduledAt: Date): Promise<string> {
    // Find a doctor without a conflicting booking or unavailability
    const scheduledStart = dayjs(scheduledAt);
    const scheduledEnd = scheduledStart.add(30, 'minute'); // assume 30 min session

    const availableDoctor = await this.prisma.user.findFirst({
      where: {
        role: {
          name: 'doctor', // filter by role name
        },
        // No booking conflicts at scheduledAt
        bookingsAsDoctor: {
          none: {
            scheduledAt: {
              gte: scheduledStart.toDate(),
              lt: scheduledEnd.toDate(),
            },
            status: { in: [BookingStatus.confirmed, BookingStatus.pending] },
          },
        },
        // No unavailability conflicts
        doctorUnavailabilities: {
          none: {
            AND: [
              { startTime: { lte: scheduledStart.toDate() } },
              { endTime: { gt: scheduledStart.toDate() } },
            ],
          },
        },
      },
    });

    if (!availableDoctor) {
      throw new BadRequestException('No doctors available at this time slot');
    }

    return availableDoctor.id;
  }

  // Mark doctor unavailable by adding DoctorUnavailability record for that time slot
  async markDoctorUnavailable(doctorId: string, scheduledAt: Date) {
    const slotStart = dayjs(scheduledAt);
    const slotEnd = slotStart.add(30, 'minute'); // fixed 30 min slot

    // Check if already blocked to avoid duplicates (optional)
    const existingBlock = await this.prisma.doctorUnavailability.findFirst({
      where: {
        doctorId,
        startTime: slotStart.toDate(),
        endTime: slotEnd.toDate(),
      },
    });
    if (existingBlock) return;

    await this.prisma.doctorUnavailability.create({
      data: {
        doctorId,
        date: slotStart.startOf('day').toDate(),
        startTime: slotStart.toDate(),
        endTime: slotEnd.toDate(),
        reason: 'Booked session',
      },
    });
  }
}
