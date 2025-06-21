import { Module } from '@nestjs/common';
import { TimeSlotsService } from './time-slots.service';
import { TimeSlotsController } from './time-slots.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseModule } from 'src/response/response.module';

@Module({
  imports: [ResponseModule],
  controllers: [TimeSlotsController],
  providers: [TimeSlotsService, PrismaService],
})
export class TimeSlotsModule {}
