// chat.controller.ts
import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
  Param,
  ValidationPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ResponseService } from 'src/response/response.service';
import { GetChatSessionsDto } from './dto/get-chat-sessions.dto';
import { GetChatMessagesDto } from './dto/get-chat-messages.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Chat')
@ApiBearerAuth()
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
    const messages = await this.chatService.getMessagesBySender(senderId);
    return this.responseService.successResponse(
      'Message History fetched sucessfully',
      messages,
    );
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all chat sessions for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Chat sessions retrieved successfully',
  })
  async getChatSessions(
    @Request() req,
    @Query(ValidationPipe) query: GetChatSessionsDto,
  ) {
    const userId = req.user.id;
    const { page, limit, status } = query;

    const result = await this.chatService.getChatSessions(
      userId,
      page,
      limit,
      status,
    );

    return this.responseService.successResponse(
      'Chat sessions retrieved successfully',
      result,
    );
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Get messages in a specific chat session' })
  @ApiResponse({
    status: 200,
    description: 'Chat messages retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat session not found or access denied',
  })
  async getChatMessages(
    @Request() req,
    @Param('sessionId') sessionId: string,
    @Query(ValidationPipe) query: GetChatMessagesDto,
  ) {
    const userId = req.user.id;
    const { page, limit } = query;

    const result = await this.chatService.getChatMessages(
      sessionId,
      userId,
      page,
      limit,
    );

    return this.responseService.successResponse(
      'Chat messages retrieved successfully',
      result,
    );
  }
}
