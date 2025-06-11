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
import { BookingStatus, PaymentType, SessionType } from '@prisma/client';
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

function isSlotAvailable(
  slotStart: Date,
  unavail: { startTime: Date; endTime: Date }[],
  bookings: { scheduledAt: Date }[],
) {
  const slotEnd = new Date(slotStart.getTime() + SESSION_DURATION_MS);
  for (const ua of unavail) {
    if (overlaps(slotStart, slotEnd, ua.startTime, ua.endTime)) return false;
  }
  for (const b of bookings) {
    const bEnd = new Date(b.scheduledAt.getTime() + SESSION_DURATION_MS);
    if (overlaps(slotStart, slotEnd, b.scheduledAt, bEnd)) return false;
  }
  return true;
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
    const { type, scheduledAt, doctorId, paymentType } = dto;

    const patientId = clientId;

    if (!scheduledAt || !dayjs(scheduledAt).isValid()) {
      throw new BadRequestException('Invalid scheduledAt date');
    }

    // Check client role
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
      include: { role: true },
    });

    if (!client || client.role.name.toLowerCase() !== 'client') {
      throw new ForbiddenException('Only clients can create bookings');
    }

    // Get active user plans
    const activePlans = await this.prisma.userPlan.findMany({
      where: {
        patientId: clientId,
        isActive: true,
      },
      include: { package: true },
    });

    // Assign doctor
    const assignedDoctorId =
      doctorId || (await this.assignAvailableDoctor(new Date(scheduledAt)));

    const consultationCharge = await this.getConsultationCharge(
      assignedDoctorId,
      type,
    );

    // One-time payment
    if (paymentType === PaymentType.one_time) {
      const booking = await this.prisma.booking.create({
        data: {
          doctorId: assignedDoctorId,
          patientId,
          scheduledAt: new Date(scheduledAt),
          type,
          paymentType,
          isPaid: false, // <-- Payment not confirmed yet
          userPlanId: null,
          amount: consultationCharge,
          status: BookingStatus.pending, // <-- Mark as pending until payment is completed
        },
      });

      const paymentIntent = await this.stripeService.createPaymentIntent(
        patientId,
        Number(consultationCharge),
        PaymentType.one_time,
        {
          patientId,
          doctorId: assignedDoctorId,
          bookingId: booking.id, // Optional: attach booking ID for later confirmation
        },
      );

      return {
        booking,
        paymentIntent,
        message: 'Booking created. Confirm payment on frontend.',
      };
    }

    // Plan payment
    if (paymentType === PaymentType.plan) {
      if (activePlans.length === 0) {
        throw new BadRequestException('No active plans found for user');
      }

      const selectedPlan = activePlans.find((p) => p.bookingsPending > 0);

      if (!selectedPlan) {
        throw new BadRequestException('Plan usage limit reached');
      }

      const frequencyInDays = selectedPlan.package.timePeriod;

      const lastBooking = await this.prisma.booking.findFirst({
        where: {
          patientId,
          userPlanId: selectedPlan.id,
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

      const booking = await this.prisma.booking.create({
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
        },
      });

      await this.prisma.userPlan.update({
        where: { id: selectedPlan.id },
        data: { bookingsPending: { decrement: 1 } },
      });

      await this.markDoctorUnavailable(assignedDoctorId, new Date(scheduledAt));

      return booking;
    }

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
      where.scheduledAt = {};
      if (fromDate) {
        where.scheduledAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.scheduledAt.lte = new Date(toDate);
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

  // Get available time slots for doctor on a given date

  async getAvailableSlots(dto: GetTimeSlotsDto) {
    const { doctorId, date } = dto;

    const dayStart = new Date(date);
    dayStart.setHours(8, 0, 0, 0); // 8:00 AM

    const dayEnd = new Date(date);
    dayEnd.setHours(18, 0, 0, 0); // 6:00 PM

    const [unavailabilities, bookings] = await Promise.all([
      this.prisma.doctorUnavailability.findMany({
        where: {
          doctorId,
          date: new Date(date),
        },
        select: { startTime: true, endTime: true },
      }),
      this.prisma.booking.findMany({
        where: {
          doctorId,
          scheduledAt: {
            gte: dayStart,
            lt: dayEnd,
          },
          status: {
            notIn: ['cancelled', 'missed'],
          },
        },
        select: { scheduledAt: true },
      }),
    ]);

    const results: { time: string; available: boolean }[] = [];
    const slotTime = new Date(dayStart);

    while (slotTime < dayEnd) {
      const slotCopy = new Date(slotTime); // Avoid mutation
      const available = isSlotAvailable(slotCopy, unavailabilities, bookings);

      results.push({
        time: slotCopy.toISOString(),
        available,
      });

      slotTime.setTime(slotTime.getTime() + SESSION_DURATION_MS);
    }

    return results;
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
