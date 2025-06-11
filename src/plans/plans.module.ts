import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseModule } from 'src/response/response.module';
import { StripeModule } from 'src/stripe/stripe.module';

@Module({
  imports: [ResponseModule, StripeModule],
  controllers: [PlansController],
  providers: [PlansService, PrismaService],
  exports: [PlansService],
})
export class PlansModule {}
