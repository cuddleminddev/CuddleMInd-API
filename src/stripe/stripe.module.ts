import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { BookingsModule } from 'src/bookings/bookings.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    forwardRef(() => BookingsModule),
    NotificationsModule,
  ],
  providers: [StripeService],
  controllers: [StripeController],
  exports: [StripeService],
})
export class StripeModule { }
