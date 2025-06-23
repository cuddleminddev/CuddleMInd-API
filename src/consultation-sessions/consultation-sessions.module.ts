import { Module } from '@nestjs/common';
import { ConsultationSessionsService } from './consultation-sessions.service';
import { ConsultationSessionsController } from './consultation-sessions.controller';
import { ChatGateway } from 'src/chat/chat.gateway';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [ConsultationSessionsController],
  providers: [ConsultationSessionsService],
})
export class ConsultationSessionsModule {}
