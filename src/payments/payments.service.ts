import { Injectable } from '@nestjs/common';
import { Stripe } from 'stripe';
import { InjectStripe } from 'nestjs-stripe';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentType, TransactionStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createOneTimePayment({
    userId,
    bookingId,
    amount,
  }: {
    userId: string;
    bookingId: string;
    amount: number;
  }) {
    return this.prisma.transaction.create({
      data: {
        userId,
        bookingId,
        amount,
        status: TransactionStatus.success,
        paymentType: PaymentType.one_time,
      },
    });
  }
}
