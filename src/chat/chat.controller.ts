// chat.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages-by-sender')
  async getMessagesBySender(@Query('senderId') senderId: string) {
    return this.chatService.getMessagesBySender(senderId);
  }
}
