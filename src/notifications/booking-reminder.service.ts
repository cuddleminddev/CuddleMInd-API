import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

/**
 * BookingReminderService
 *
 * Runs every minute and checks for confirmed bookings that are scheduled
 * to start in approximately 5 minutes. When found, it sends a push
 * notification to both the doctor and the patient.
 *
 * To avoid duplicate notifications, a `reminderSent` flag on the Booking
 * model is set to true after the first notification is dispatched.
 */
@Injectable()
export class BookingReminderService {
  private readonly logger = new Logger(BookingReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Runs every minute.
   * Finds bookings in the [now+4min, now+6min] window that haven't
   * had a reminder sent yet and dispatches push notifications.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendUpcomingBookingReminders() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 4 * 60 * 1000); // now + 4 min
    const windowEnd = new Date(now.getTime() + 6 * 60 * 1000);   // now + 6 min

    const upcomingBookings = await this.prisma.booking.findMany({
      where: {
        status: 'confirmed',
        scheduledAt: {
          gte: windowStart,
          lte: windowEnd,
        },
        reminderSent: false,
      },
      include: {
        doctor: { select: { id: true, name: true, fcmToken: true } },
        patient: { select: { id: true, name: true, fcmToken: true } },
      },
    });

    if (upcomingBookings.length === 0) return;

    this.logger.log(
      `⏰ Sending reminders for ${upcomingBookings.length} upcoming booking(s)`,
    );

    for (const booking of upcomingBookings) {
      try {
        await this.notificationsService.notifyUpcomingBooking(
          booking.doctorId,
          booking.patientId,
          booking.doctor.name,
          booking.patient.name,
          booking.scheduledAt,
          booking.id,
        );

        // Mark reminder as sent so we don't re-notify on the next cron tick
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { reminderSent: true },
        });

        this.logger.log(
          `✅ Reminder sent for booking ${booking.id} ` +
            `(doctor: ${booking.doctor.name}, patient: ${booking.patient.name})`,
        );
      } catch (err) {
        this.logger.error(
          `❌ Failed to send reminder for booking ${booking.id}: ${err.message}`,
        );
      }
    }
  }
}
