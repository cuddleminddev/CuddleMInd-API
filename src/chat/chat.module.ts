import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsModule } from 'src/bookings/bookings.module';

@Module({
  imports: [BookingsModule],
  providers: [ChatGateway, ChatService, PrismaService],
})
export class ChatModule {}
