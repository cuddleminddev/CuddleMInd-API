// chat.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  UseGuards,
  Param,
  ValidationPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ResponseService } from 'src/response/response.service';
import { GetChatSessionsDto } from './dto/get-chat-sessions.dto';
import { GetChatMessagesDto } from './dto/get-chat-messages.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly responseService: ResponseService,
    private readonly chatGateway: ChatGateway,
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

  /**
   * MOCK ENDPOINT — for testing doctor incoming session notification.
   * Directly fires the `instant_session_started` WebSocket event to the
   * specified doctor without going through the full payment/webhook flow.
   *
   * POST /chat/mock/doctor-incoming
   */
  @Post('mock/doctor-incoming')
  @ApiOperation({
    summary: '[MOCK] Simulate an incoming session notification for a doctor',
    description:
      'Fires instant_session_started directly to the connected doctor socket. ' +
      'Use this to test the doctor UI without completing a real payment.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['doctorId'],
      properties: {
        doctorId:      { type: 'string', description: 'ID of the connected doctor' },
        patientId:     { type: 'string', example: 'mock-patient-id' },
        patientName:   { type: 'string', example: 'Test Patient' },
        bookingId:     { type: 'string', example: 'mock-booking-id' },
        sessionId:     { type: 'string', example: 'mock-session-id' },
        sessionType:   { type: 'string', example: 'video' },
        zegocloudRoomId: { type: 'string', example: 'zego-mock-room-123' },
        scheduledAt:   { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Event fired (doctor may or may not be connected)' })
  mockDoctorIncoming(@Body() body: {
    doctorId: string;
    patientId?: string;
    patientName?: string;
    bookingId?: string;
    sessionId?: string;
    sessionType?: string;
    zegocloudRoomId?: string;
    scheduledAt?: string;
  }) {
    const now = new Date().toISOString();
    const payload = {
      sessionId:       body.sessionId       ?? `mock-session-${Date.now()}`,
      patientId:       body.patientId       ?? 'mock-patient-id',
      patientName:     body.patientName     ?? 'Test Patient',
      doctorId:        body.doctorId,
      bookingId:       body.bookingId       ?? `mock-booking-${Date.now()}`,
      sessionType:     body.sessionType     ?? 'video',
      zegocloudRoomId: body.zegocloudRoomId ?? `zego-mock-${Date.now()}`,
      scheduledAt:     body.scheduledAt     ?? now,
    };

    this.chatGateway.notifyDoctorOfInstantSession(body.doctorId, payload);

    return this.responseService.successResponse(
      'Mock instant_session_started event fired to doctor',
      { fired: true, payload },
    );
  }
}
