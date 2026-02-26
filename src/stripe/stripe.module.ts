import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { BookingsModule } from 'src/bookings/bookings.module';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => BookingsModule),
    forwardRef(() => ChatModule),
  ],
  providers: [StripeService],
  controllers: [StripeController],
  exports: [StripeService],
})
export class StripeModule {}
