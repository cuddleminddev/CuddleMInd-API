import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsModule } from 'src/bookings/bookings.module';
import { ChatController } from './chat.controller';

@Module({
  imports: [BookingsModule],
  providers: [ChatGateway, ChatService, PrismaService],
  exports: [ChatGateway],
  controllers: [ChatController],
})
export class ChatModule {}
