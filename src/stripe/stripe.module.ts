import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'STRIPE_SECRET',
      useFactory: (cs: ConfigService) => cs.get<string>('STRIPE_SECRET_KEY'),
      inject: [ConfigService],
    },
    StripeService,
  ],
  controllers: [StripeController],
  exports: [StripeService],
})
export class StripeModule {}
