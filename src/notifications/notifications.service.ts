import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly firebaseInitialized: boolean;

  constructor(private readonly prisma: PrismaService) {
    this.firebaseInitialized = this.initializeFirebase();
  }

  private initializeFirebase(): boolean {
    try {
      if (admin.apps.length > 0) return true;

      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!serviceAccountJson) {
        this.logger.warn(
          '⚠️ FIREBASE_SERVICE_ACCOUNT_JSON is not set. Push notifications will be disabled.',
        );
        return false;
      }

      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.logger.log('✅ Firebase Admin initialized successfully');
      return true;
    } catch (err) {
      this.logger.error('❌ Failed to initialize Firebase Admin:', err.message);
      return false;
    }
  }

  // ─── FCM Token Management ────────────────────────────────────────────────────

  /**
   * Store or update the FCM device token for a user.
   * Any previous token for the same user is replaced.
   */
  async setFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
    this.logger.log(`📱 FCM token saved for user ${userId}`);
  }

  /**
   * Remove the FCM token for a user (e.g. on logout).
   */
  async removeFcmToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });
    this.logger.log(`🗑️ FCM token removed for user ${userId}`);
  }

  // ─── Core Send ───────────────────────────────────────────────────────────────

  /**
   * Send a push notification to a specific user by their DB id.
   * Silently skips if the user has no FCM token or Firebase is disabled.
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseInitialized) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true, name: true },
    });

    if (!user?.fcmToken) {
      this.logger.verbose(`No FCM token for user ${userId} — skipping push`);
      return;
    }

    await this.sendToToken(user.fcmToken, title, body, data);
  }

  /**
   * Send a push notification directly to an FCM token.
   */
  async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseInitialized) return;

    try {
      const message: admin.messaging.Message = {
        token,
        notification: { title, body },
        data: data ?? {},
        android: { priority: 'high' },
        apns: {
          payload: { aps: { sound: 'default', contentAvailable: true } },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`✅ Push notification sent: ${response}`);
    } catch (err) {
      // Token may be stale — log but do not throw
      this.logger.warn(`⚠️ Push notification failed for token: ${err.message}`);
    }
  }

  // ─── Domain Notification Helpers ─────────────────────────────────────────────

  /**
   * Notify a doctor that a new booking has been assigned to them.
   */
  async notifyDoctorNewBooking(
    doctorId: string,
    patientName: string,
    scheduledAt: Date,
    bookingId: string,
  ): Promise<void> {
    const time = scheduledAt.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    await this.sendToUser(
      doctorId,
      '📅 New Booking Assigned',
      `You have a new session with ${patientName} on ${time}.`,
      { type: 'new_booking', bookingId },
    );
  }

  /**
   * Notify both doctor and patient about an upcoming booking (5-min reminder).
   */
  async notifyUpcomingBooking(
    doctorId: string,
    patientId: string,
    doctorName: string,
    patientName: string,
    scheduledAt: Date,
    bookingId: string,
  ): Promise<void> {
    const time = scheduledAt.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    await Promise.all([
      this.sendToUser(
        doctorId,
        '⏰ Upcoming Session Reminder',
        `Your session with ${patientName} starts in 5 minutes (${time}).`,
        { type: 'booking_reminder', bookingId },
      ),
      this.sendToUser(
        patientId,
        '⏰ Upcoming Session Reminder',
        `Your session with Dr. ${doctorName} starts in 5 minutes (${time}).`,
        { type: 'booking_reminder', bookingId },
      ),
    ]);
  }
}
