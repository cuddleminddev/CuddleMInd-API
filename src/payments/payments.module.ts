import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
