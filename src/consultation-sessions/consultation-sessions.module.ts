import { Module } from '@nestjs/common';
import { ConsultationSessionsService } from './consultation-sessions.service';
import { ConsultationSessionsController } from './consultation-sessions.controller';
import { ChatGateway } from 'src/chat/chat.gateway';
import { ChatModule } from 'src/chat/chat.module';
import { ResponseModule } from 'src/response/response.module';

@Module({
  imports: [ChatModule, ResponseModule],
  controllers: [ConsultationSessionsController],
  providers: [ConsultationSessionsService],
})
export class ConsultationSessionsModule {}
