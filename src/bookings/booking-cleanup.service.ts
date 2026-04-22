import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import dayjs from 'dayjs';

@Injectable()
export class BookingCleanupService {
  private readonly logger = new Logger(BookingCleanupService.name);

  constructor(private prisma: PrismaService) { }

  private async getBookingDurationMinutes() {
    const setting = await this.prisma.bookingSetting.findUnique({
      where: { settingKey: 'default' },
      select: { bookingDurationMinutes: true },
    });

    return setting?.bookingDurationMinutes ?? 30;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredPendingBookings() {
    const cutoff = dayjs().subtract(10, 'minute').toDate();
    const bookingDurationMinutes = await this.getBookingDurationMinutes();

    const staleBookings = await this.prisma.booking.findMany({
      where: {
        status: 'pending',
        isPaid: false,
        paymentType: 'one_time',
        createdAt: { lt: cutoff },
      },
      include: {
        transaction: true,
      },
    });

    if (staleBookings.length === 0) return;

    this.logger.log(
      `🧹 Cleaning ${staleBookings.length} expired pending bookings`,
    );

    for (const booking of staleBookings) {
      await this.prisma.$transaction(async (tx) => {
        // 1. Update booking to 'failed'
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'failed' },
        });

        // 2. Update transaction to 'failed' if exists
        if (booking.transaction) {
          await tx.transaction.update({
            where: { id: booking.transaction.id },
            data: { status: 'failed' },
          });
        }

        // 3. Remove doctor's unavailable time block
        await tx.doctorUnavailability.deleteMany({
          where: {
            doctorId: booking.doctorId,
            startTime: booking.scheduledAt,
            endTime: dayjs(booking.scheduledAt)
              .add(bookingDurationMinutes, 'minute')
              .toDate(),
            reason: 'Booked session',
          },
        });

        this.logger.log(`🗑️ Booking ${booking.id} expired and cleaned`);
      });
    }
  }
}
