import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { BookingStatus, PaymentType, TransactionStatus } from '@prisma/client';
import { BookingsService } from 'src/bookings/bookings.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class StripeService {
  private razorpay: Razorpay;

  constructor(
    private configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BookingsService))
    private bookingsService: BookingsService,
    private eventEmitter: EventEmitter2,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('RAZORPAY_KEY_ID'),
      key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET'),
    });
  }

  /**
   * Creates a Razorpay order (replaces Stripe PaymentIntent).
   * Returns orderId + keyId so the frontend can open the Razorpay checkout SDK.
   */
  async createPaymentIntent(
    userId: string,
    amount: number,
    type: PaymentType,
    metadata: Record<string, string>,
  ) {
    const order = await this.razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      notes: {
        userId,
        type,
        ...metadata,
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
    };
  }

  /**
   * Verifies the Razorpay webhook signature and processes the payment event.
   * Called from POST /webhook/razorpay.
   */
  async handleWebhook(signature: string, payload: Buffer) {
    console.log('\n========== [WEBHOOK] Incoming Razorpay Webhook ==========');
    console.log('[WEBHOOK] Payload size (bytes):', payload?.length ?? 0);
    console.log('[WEBHOOK] Received signature  :', signature);

    const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[WEBHOOK] ❌ RAZORPAY_WEBHOOK_SECRET is not set in environment!');
      throw new BadRequestException('Server misconfiguration: missing Razorpay webhook secret');
    }
    console.log('[WEBHOOK] Using RAZORPAY_WEBHOOK_SECRET (first 6):', webhookSecret.slice(0, 6) + '******');

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    console.log('[WEBHOOK] Expected signature  :', expectedSignature);

    if (expectedSignature !== signature) {
      console.error('[WEBHOOK] ❌ Signature mismatch! Webhook rejected.');
      throw new BadRequestException('Invalid Razorpay webhook signature');
    }
    console.log('[WEBHOOK] ✅ Signature verified.');

    let event: any;
    try {
      event = JSON.parse(payload.toString());
    } catch (err) {
      console.error('[WEBHOOK] ❌ Failed to parse JSON payload:', err);
      throw new BadRequestException('Invalid webhook payload');
    }

    const eventType: string = event.event;
    console.log('[WEBHOOK] Event type          :', eventType);
    console.log('[WEBHOOK] Full event payload  :', JSON.stringify(event, null, 2));

    switch (eventType) {
      case 'payment.captured': {
        const payment = event.payload?.payment?.entity;
        if (payment) {
          console.log('[WEBHOOK] Routing to handlePaymentCaptured, payment id:', payment.id);
          await this.handlePaymentCaptured(payment);
        } else {
          console.warn('[WEBHOOK] ⚠️  payment.captured event has no payment entity.');
        }
        break;
      }

      case 'payment.failed': {
        const payment = event.payload?.payment?.entity;
        if (payment) {
          console.log('[WEBHOOK] Routing to handlePaymentFailed, payment id:', payment.id);
          await this.handlePaymentFailed(payment);
        } else {
          console.warn('[WEBHOOK] ⚠️  payment.failed event has no payment entity.');
        }
        break;
      }

      default:
        console.warn(`[WEBHOOK] ⚠️  Unhandled Razorpay event type: ${eventType}`);
    }

    console.log('[WEBHOOK] ✅ Webhook handled successfully.');
    console.log('========================================================\n');
    return { received: true };
  }

  /**
   * Handles a successful Razorpay payment (replaces handleSuccessfulPaymentIntent).
   */
  private async handlePaymentCaptured(payment: any) {
    console.log('\n---------- [CAPTURED] Payment Captured ----------');
    console.log('[CAPTURED] Payment ID   :', payment.id);
    console.log('[CAPTURED] Amount (₹)  :', Number(payment.amount) / 100);
    console.log('[CAPTURED] Status       :', payment.status);
    console.log('[CAPTURED] Notes        :', JSON.stringify(payment.notes, null, 2));

    const notes = payment.notes || {};
    const userId: string = notes.userId;
    const type = notes.type as PaymentType;
    const amount = Number(payment.amount) / 100;

    if (!userId || !type) {
      console.warn('[CAPTURED] ⚠️  Missing userId or type in payment notes. Aborting.', notes);
      return;
    }
    console.log(`[CAPTURED] userId=${userId}  type=${type}  amount=₹${amount}`);

    // Record the transaction
    console.log('[CAPTURED] Creating transaction record...');
    const tx = await this.prisma.transaction.create({
      data: {
        userId,
        amount,
        status: TransactionStatus.success,
        paymentType: type,
      },
    });
    console.log('[CAPTURED] ✅ Transaction created, id:', tx.id);

    // Handle plan payment (activate plan + confirm any pending booking)
    if (type === PaymentType.plan && notes.userPlanId) {
      console.log('[CAPTURED] [PLAN] Activating userPlan:', notes.userPlanId);
      await this.prisma.userPlan.update({
        where: { id: notes.userPlanId },
        data: {
          isActive: true,
          startDate: new Date(),
          endDate: (() => {
            const end = new Date();
            end.setMonth(end.getMonth() + 1);
            return end;
          })(),
        },
      });
      console.log('[CAPTURED] [PLAN] ✅ UserPlan activated.');

      // If a booking was pre-created (no-plan flow), confirm it now
      if (notes.bookingId) {
        console.log('[CAPTURED] [PLAN] Looking up pending booking:', notes.bookingId);
        const booking = await this.prisma.booking.findUnique({
          where: { id: notes.bookingId },
        });

        if (booking) {
          console.log('[CAPTURED] [PLAN] Booking found, confirming...');
          await this.prisma.booking.update({
            where: { id: notes.bookingId },
            data: {
              isPaid: true,
              status: BookingStatus.confirmed,
              userPlanId: notes.userPlanId,
            },
          });
          console.log('[CAPTURED] [PLAN] ✅ Booking confirmed.');

          await this.bookingsService.sendDoctorBookingStatusEmail(
            notes.bookingId,
            'confirmed',
          );

          // Notify the patient by email now that payment is confirmed.
          // This is the ONLY place the patient confirmation email fires —
          // never at booking creation time.
          await this.bookingsService.sendPatientBookingConfirmationEmail(
            notes.bookingId,
          );

          await this.prisma.userPlan.update({
            where: { id: notes.userPlanId },
            data: { bookingsPending: { decrement: 1 } },
          });
          console.log('[CAPTURED] [PLAN] ✅ bookingsPending decremented.');

          // Create consultation session for the confirmed booking
          console.log('[CAPTURED] [PLAN] Creating consultation session...');
          await this.bookingsService.createConsultationSession(booking);
          console.log('[CAPTURED] [PLAN] ✅ Consultation session created.');

          // Mark doctor unavailable now that booking is confirmed
          await this.bookingsService.markDoctorUnavailable(
            booking.doctorId,
            booking.scheduledAt,
          );
          console.log('[CAPTURED] [PLAN] ✅ Doctor marked unavailable.');

          // Notify patient via WebSocket (decoupled through EventEmitter)
          this.eventEmitter.emit('payment.confirmed', {
            patientId: booking.patientId,
            bookingId: booking.id,
            scheduledAt: booking.scheduledAt,
            doctorId: booking.doctorId,
            sessionType: booking.sessionType,
            bookingType: booking.type,
          });
          console.log('[CAPTURED] [PLAN] ✅ Pending booking confirmed via plan purchase webhook:', notes.bookingId);
        } else {
          console.warn('[CAPTURED] [PLAN] ⚠️  Booking not found for id:', notes.bookingId);
        }
      } else {
        console.log('[CAPTURED] [PLAN] No bookingId in notes; skipping booking confirmation.');
      }
    } else if (type === PaymentType.plan && !notes.userPlanId) {
      console.warn('[CAPTURED] [PLAN] ⚠️  type=plan but no userPlanId in notes! Nothing to activate.');
    }

    // Handle one-time booking payment
    if (type === PaymentType.one_time && notes.bookingId) {
      const bookingId = notes.bookingId;
      console.log('[CAPTURED] [ONE_TIME] Looking up booking:', bookingId);

      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        console.error('[CAPTURED] [ONE_TIME] ❌ Booking not found for ID:', bookingId);
        throw new Error(`Booking not found for ID: ${bookingId}`);
      }
      console.log('[CAPTURED] [ONE_TIME] Booking found. Updating status to confirmed...');

      // Update the booking status to confirmed and mark as paid
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          isPaid: true,
          status: BookingStatus.confirmed,
        },
      });
      console.log('[CAPTURED] [ONE_TIME] ✅ Booking confirmed.');

      await this.bookingsService.sendDoctorBookingStatusEmail(
        bookingId,
        'confirmed',
      );

      // Notify the patient by email now that payment is confirmed.
      // This is the ONLY place the patient confirmation email fires —
      // never at booking creation time.
      await this.bookingsService.sendPatientBookingConfirmationEmail(bookingId);

      // Add consultation session
      console.log('[CAPTURED] [ONE_TIME] Creating consultation session...');
      await this.bookingsService.createConsultationSession(booking);
      console.log('[CAPTURED] [ONE_TIME] ✅ Consultation session created.');

      // Mark doctor unavailable for the booked time
      console.log('[CAPTURED] [ONE_TIME] Marking doctor unavailable, doctorId:', booking.doctorId);
      await this.bookingsService.markDoctorUnavailable(
        booking.doctorId,
        booking.scheduledAt,
      );
      console.log('[CAPTURED] [ONE_TIME] ✅ Doctor marked unavailable.');

      // Notify patient via WebSocket (decoupled through EventEmitter)
      this.eventEmitter.emit('payment.confirmed', {
        patientId: booking.patientId,
        bookingId: bookingId,
        scheduledAt: booking.scheduledAt,
        doctorId: booking.doctorId,
        sessionType: booking.sessionType,
        bookingType: booking.type,
      });
      console.log('[CAPTURED] [ONE_TIME] ✅ payment.confirmed event emitted.');
    } else if (type === PaymentType.one_time && !notes.bookingId) {
      console.warn('[CAPTURED] [ONE_TIME] ⚠️  type=one_time but no bookingId in notes!');
    }

    console.log('---------- [CAPTURED] Done ----------\n');
  }

  /**
   * Handles a failed Razorpay payment.
   */
  private async handlePaymentFailed(payment: any) {
    console.log('\n---------- [FAILED] Payment Failed ----------');
    console.log('[FAILED] Payment ID       :', payment.id);
    console.log('[FAILED] Amount (₹)       :', Number(payment.amount) / 100);
    console.log('[FAILED] Error code       :', payment.error_code);
    console.log('[FAILED] Error description:', payment.error_description);
    console.log('[FAILED] Error source     :', payment.error_source);
    console.log('[FAILED] Error step       :', payment.error_step);
    console.log('[FAILED] Error reason     :', payment.error_reason);
    console.log('[FAILED] Notes            :', JSON.stringify(payment.notes, null, 2));

    const notes = payment.notes || {};
    const userId: string = notes.userId;
    const bookingId: string = notes.bookingId;

    // Mark booking as failed and notify patient
    if (bookingId) {
      const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
      if (booking && booking.status === BookingStatus.pending) {
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.failed },
        });
        console.log('[FAILED] ✅ Booking marked as failed:', bookingId);

        // Notify patient via WebSocket (decoupled through EventEmitter)
        this.eventEmitter.emit('payment.failed', {
          patientId: booking.patientId,
          bookingId,
          reason: payment.error_description || payment.error_reason || 'Payment failed',
        });
        console.log('[FAILED] ✅ payment.failed event emitted.');
      }
    }

    // Also deactivate any inactive UserPlan that was pre-created for this payment
    if (notes.userPlanId) {
      await this.prisma.userPlan.updateMany({
        where: { id: notes.userPlanId, isActive: false },
        data: { isActive: false }, // already false; entry left for auditing
      });
      console.log('[FAILED] ℹ️  UserPlan left inactive (not activated):', notes.userPlanId);
    }

    if (userId) {
      console.warn('[FAILED] ⚠️  Payment failure for userId:', userId);
    } else {
      console.warn('[FAILED] ⚠️  No userId in notes, cannot associate failure with a user.');
    }
    console.log('---------- [FAILED] Done ----------\n');
  }
}
