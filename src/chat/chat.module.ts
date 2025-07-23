import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsModule } from 'src/bookings/bookings.module';
import { ChatController } from './chat.controller';
import { ResponseModule } from 'src/response/response.module';

@Module({
  imports: [BookingsModule, ResponseModule],
  providers: [ChatGateway, ChatService, PrismaService],
  exports: [ChatGateway],
  controllers: [ChatController],
})
export class ChatModule {}
