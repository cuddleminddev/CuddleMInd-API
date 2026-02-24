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

@Injectable()
export class StripeService {
  private razorpay: Razorpay;

  constructor(
    private configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BookingsService))
    private bookingsService: BookingsService,
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
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid Razorpay webhook signature');
    }

    let event: any;
    try {
      event = JSON.parse(payload.toString());
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const eventType: string = event.event;

    switch (eventType) {
      case 'payment.captured': {
        const payment = event.payload?.payment?.entity;
        if (payment) {
          await this.handlePaymentCaptured(payment);
        }
        break;
      }

      case 'payment.failed': {
        const payment = event.payload?.payment?.entity;
        if (payment) {
          await this.handlePaymentFailed(payment);
        }
        break;
      }

      default:
        console.log(`Unhandled Razorpay event type: ${eventType}`);
    }

    return { received: true };
  }

  /**
   * Handles a successful Razorpay payment (replaces handleSuccessfulPaymentIntent).
   */
  private async handlePaymentCaptured(payment: any) {
    console.log('✅ Razorpay payment captured:', payment.id);

    const notes = payment.notes || {};
    const userId: string = notes.userId;
    const type = notes.type as PaymentType;
    const amount = Number(payment.amount) / 100;

    if (!userId || !type) {
      console.warn('⚠️ Missing userId or type in payment notes:', notes);
      return;
    }

    // Record the transaction
    await this.prisma.transaction.create({
      data: {
        userId,
        amount,
        status: TransactionStatus.success,
        paymentType: type,
      },
    });

    // Handle plan payment (activate plan)
    if (type === PaymentType.plan && notes.userPlanId) {
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
    }

    // Handle one-time booking payment
    if (type === PaymentType.one_time && notes.bookingId) {
      const bookingId = notes.bookingId;

      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error(`Booking not found for ID: ${bookingId}`);
      }

      // Update the booking status to confirmed and mark as paid
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          isPaid: true,
          status: BookingStatus.confirmed,
        },
      });

      // Add consultation session
      await this.bookingsService.createConsultationSession(booking);

      // Mark doctor unavailable for the booked time
      await this.bookingsService.markDoctorUnavailable(
        booking.doctorId,
        booking.scheduledAt,
      );
    }
  }

  /**
   * Handles a failed Razorpay payment.
   */
  private async handlePaymentFailed(payment: any) {
    console.warn(`❌ Razorpay payment failed: ${payment.id}`);

    const notes = payment.notes || {};
    const userId: string = notes.userId;

    if (userId) {
      console.warn(`Payment failure for user: ${userId}`);
      // Optionally notify user or deactivate pending plan, etc.
    }
  }
}
