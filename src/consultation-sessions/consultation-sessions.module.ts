import { Module } from '@nestjs/common';
import { ConsultationSessionsService } from './consultation-sessions.service';
import { ConsultationSessionsController } from './consultation-sessions.controller';

@Module({
  controllers: [ConsultationSessionsController],
  providers: [ConsultationSessionsService],
})
export class ConsultationSessionsModule {}
