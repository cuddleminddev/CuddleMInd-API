import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { StripeModule } from 'nestjs-stripe';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    StripeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        apiKey: process.env.STRIPE_SECRET_KEY,
        apiVersion: '2025-02-24.acacia',
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
