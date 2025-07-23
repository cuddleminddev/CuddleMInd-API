// chat.controller.ts
import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ResponseService } from 'src/response/response.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('messages-by-sender')
  async getMessagesBySender(@Request() req) {
    const senderId = req.user.id;
    const messages = this.chatService.getMessagesBySender(senderId);
    return this.responseService.successResponse(
      'Message History fetched sucessfully',
      messages,
    );
  }
}
