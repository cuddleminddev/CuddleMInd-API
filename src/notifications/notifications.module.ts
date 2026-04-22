import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { BookingReminderService } from './booking-reminder.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ResponseModule } from '../response/response.module';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [PrismaModule, ResponseModule, MailerModule],
  providers: [NotificationsService, BookingReminderService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule { }
