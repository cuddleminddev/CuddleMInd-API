import { Injectable } from '@nestjs/common';
import { Stripe } from 'stripe';
import { InjectStripe } from 'nestjs-stripe';

@Injectable()
export class PaymentsService {
  constructor(@InjectStripe() private readonly stripeClient: Stripe) {}

  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    metadata: Record<string, any>;
  }) {
    return this.stripeClient.paymentIntents.create({
      amount: data.amount * 100, // amount in cents
      currency: data.currency,
      metadata: data.metadata,
    });
  }
}
