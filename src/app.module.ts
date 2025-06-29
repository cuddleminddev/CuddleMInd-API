// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { ResponseModule } from './response/response.module';
import { ChatModule } from './chat/chat.module';
import { PlansModule } from './plans/plans.module';
import { ReviewModule } from './review/review.module';
import { StripeModule } from './stripe/stripe.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ConsultationSessionsModule } from './consultation-sessions/consultation-sessions.module';
import { TimeSlotsModule } from './time-slots/time-slots.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BannersModule } from './banners/banners.module';
import { MailerModule } from './mailer/mailer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env${process.env.NODE_ENV === 'test' ? '.test' : ''}`,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    BookingsModule,
    PaymentsModule,
    ResponseModule,
    ChatModule,
    PlansModule,
    ReviewModule,
    StripeModule,
    AnalyticsModule,
    ConsultationSessionsModule,
    TimeSlotsModule,
    BannersModule,
    MailerModule,
  ],
})
export class AppModule {}
