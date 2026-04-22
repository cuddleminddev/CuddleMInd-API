import { forwardRef, Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ResponseModule } from 'src/response/response.module';
import { UsersModule } from 'src/users/users.module';
import { StripeModule } from 'src/stripe/stripe.module';
import { PlansModule } from 'src/plans/plans.module';
import { BookingCleanupService } from './booking-cleanup.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [
    PrismaModule,
    ResponseModule,
    UsersModule,
    forwardRef(() => StripeModule),
    PlansModule,
    NotificationsModule,
    MailerModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingCleanupService],
  exports: [BookingsService],
})
export class BookingsModule { }
