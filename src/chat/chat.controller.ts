// chat.controller.ts
import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages-by-sender')
  async getMessagesBySender(@Request() req) {
    const senderId = req.user.id;
    return this.chatService.getMessagesBySender(senderId);
  }
}
