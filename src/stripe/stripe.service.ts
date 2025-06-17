import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';
import { BookingStatus, PaymentType, TransactionStatus } from '@prisma/client';
import { BookingsService } from 'src/bookings/bookings.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BookingsService))
    private bookingsService: BookingsService,
  ) {
    const secret = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(secret, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async createPaymentIntent(
    userId: string,
    amount: number,
    type: PaymentType,
    metadata: Record<string, string>,
  ) {
    const intent = await this.stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'inr',
      metadata: {
        userId,
        type,
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    return {
      clientSecret: intent.client_secret,
    };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret,
      );
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.handleSuccessfulPaymentIntent(intent);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionCompleted(session);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleInvoicePaymentFailed(invoice);
        break;
      }

      // Add more cases if needed
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    const metadata = session.metadata;
    if (!metadata) return;

    const userId = metadata.userId;
    const type = metadata.type as PaymentType;
    const packageId = metadata.packageId;
    const amount = Number(session.amount_total) / 100;

    await this.prisma.transaction.create({
      data: {
        userId,
        amount,
        status: TransactionStatus.success,
        paymentType: type,
      },
    });

    if (type === 'plan' && packageId) {
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 1);

      await this.prisma.userPlan.create({
        data: {
          patientId: userId,
          packageId,
          bookingsPending: 4,
          startDate: start,
          endDate: end,
          isActive: true,
        },
      });
    }
  }

  private async handleSuccessfulPaymentIntent(intent: Stripe.PaymentIntent) {
    console.log('Payment intent success');

    const metadata = intent.metadata;
    const userId = metadata.userId;
    const type = metadata.type as PaymentType;
    const amount = Number(intent.amount) / 100;

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
    if (type === PaymentType.plan && metadata.userPlanId) {
      await this.prisma.userPlan.update({
        where: { id: metadata.userPlanId },
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
    if (type === PaymentType.one_time && metadata.bookingId) {
      const bookingId = metadata.bookingId;

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

      // Add consultation session now
      await this.bookingsService.createConsultationSession(booking);

      // Mark doctor unavailable for the booked time
      await this.bookingsService.markDoctorUnavailable(
        booking.doctorId,
        booking.scheduledAt,
      );
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    console.warn(`Invoice payment failed for customer: ${customerId}`);

    // Optionally notify user, deactivate plan, etc.
  }
}
