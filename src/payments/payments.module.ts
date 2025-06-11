import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { StripeModule } from 'nestjs-stripe';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
