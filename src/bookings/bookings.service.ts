import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, PaymentType, SessionType } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async createBooking(dto: CreateBookingDto) {
    const {
      doctorId,
      patientId,
      scheduledAt,
      durationMinutes,
      type,
      paymentType,
    } = dto;

    // 1. Check if doctor is unavailable at that time
    const unavailable = await this.prisma.doctorUnavailability.findFirst({
      where: {
        doctorId,
        date: scheduledAt,
        startTime: { lte: scheduledAt },
        endTime: { gte: scheduledAt },
      },
    });
    if (unavailable) {
      throw new BadRequestException(
        'Doctor is unavailable at the selected time.',
      );
    }

    // 2. Find active plan for patient if paymentType is plan
    let userPlan = null;
    if (paymentType === PaymentType.plan) {
      userPlan = await this.prisma.userPlan.findFirst({
        where: {
          patientId,
          isActive: true,
          bookingsPending: { gt: 0 },
          startDate: { lte: scheduledAt },
          OR: [{ endDate: null }, { endDate: { gte: scheduledAt } }],
        },
      });

      if (!userPlan) {
        throw new ForbiddenException(
          'No active plan or insufficient pending bookings.',
        );
      }
    }

    // 3. Create booking
    const booking = await this.prisma.booking.create({
      data: {
        doctorId,
        patientId,
        scheduledAt,
        durationMinutes,
        type,
        paymentType,
        isPaid: paymentType === PaymentType.plan, // mark paid if plan
        status: BookingStatus.confirmed,
        userPlanId: userPlan?.id ?? '',
      },
    });

    // 4. Update UserPlan bookingsPending if applicable
    if (userPlan) {
      await this.prisma.userPlan.update({
        where: { id: userPlan.id },
        data: {
          bookingsPending: { decrement: 1 },
        },
      });
    }

    // 5. Optionally: create transaction if paymentType is one_time
    if (paymentType === PaymentType.one_time) {
      await this.prisma.transaction.create({
        data: {
          userId: patientId,
          bookingId: booking.id,
          paymentType,
          amount: 50.0, // Or calculate actual cost
          status: 'pending',
        },
      });
    }

    return booking;
  }
}
