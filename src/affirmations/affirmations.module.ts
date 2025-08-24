import { Module } from '@nestjs/common';
import { AffirmationsController } from './affirmations.controller';
import { AffirmationsService } from './affirmations.service';
import { ResponseModule } from 'src/response/response.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [ResponseModule, PrismaModule],
  controllers: [AffirmationsController],
  providers: [AffirmationsService],
  exports: [AffirmationsService],
})
export class AffirmationsModule {}
