import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { BookingsModule } from 'src/bookings/bookings.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    forwardRef(() => BookingsModule),
  ],
  providers: [StripeService],
  controllers: [StripeController],
  exports: [StripeService],
})
export class StripeModule {}
