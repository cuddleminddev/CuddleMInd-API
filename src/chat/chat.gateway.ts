import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BookingsService } from 'src/bookings/bookings.service';
import { CreateBookingDto } from 'src/bookings/dto/create-booking.dto';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private consultants: Map<string, Socket> = new Map();
  private patients: Map<string, Socket> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly bookingService: BookingsService,
  ) {}

  afterInit() {
    console.log('WebSocket initialized');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const role = client.handshake.query.role as string;

    if (!userId || !role) {
      console.warn('Connection rejected: Missing userId or role');
      client.disconnect();
      return;
    }

    if (role === 'consultant') {
      this.consultants.set(userId, client);
    } else if (role === 'patient') {
      this.patients.set(userId, client);
    }

    console.log(`${role} connected: ${userId}`);
  }

  handleDisconnect(client: Socket) {
    for (const [id, sock] of this.consultants.entries()) {
      if (sock === client) {
        this.consultants.delete(id);
        console.log(`Consultant disconnected: ${id}`);
        return;
      }
    }

    for (const [id, sock] of this.patients.entries()) {
      if (sock === client) {
        this.patients.delete(id);
        console.log(`Patient disconnected: ${id}`);
        return;
      }
    }
  }

  @SubscribeMessage('send_doctor_card')
  async handleSendDoctorCard(
    @MessageBody()
    payload: {
      sessionId: string;
      patientId: string;
      doctorId: string;
    },
  ) {
    const { sessionId, patientId, doctorId } = payload;

    console.log('🟡 Received send_doctor_card request with payload:', {
      sessionId,
      patientId,
      doctorId,
    });

    // Fetch doctor profile
    const doctor = await this.chatService.getDoctorCardData(doctorId);
    if (!doctor) {
      console.error('❌ Doctor not found for ID:', doctorId);
      const patientSocket = this.patients.get(patientId);
      patientSocket?.emit('doctor_card_error', {
        sessionId,
        message: 'Doctor not found',
      });
      return;
    }

    console.log('✅ Doctor card data fetched:', doctor);

    // Attempt booking
    let bookingResult: any;
    try {
      const createBookingDto: CreateBookingDto = {
        doctorId,
        patientId,
        scheduledAt: new Date(),
        durationMinutes: 60,
        paymentType: 'one_time',
        type: 'video',
      };

      console.log(
        '📦 Sending createBookingDto to bookingService.create:',
        createBookingDto,
      );

      bookingResult = await this.bookingService.create(
        createBookingDto,
        patientId,
      );

      console.log('✅ Booking created successfully:', bookingResult);
    } catch (error) {
      console.error('❌ Booking creation failed:', error.message);
      const patientSocket = this.patients.get(patientId);
      patientSocket?.emit('doctor_card_error', {
        sessionId,
        message: error.message || 'Booking failed',
      });
      return;
    }

    const patientSocket = this.patients.get(patientId);
    if (!patientSocket) {
      console.error('❌ Patient socket not found for ID:', patientId);
      return;
    }

    const emitPayload = {
      sessionId,
      doctor,
      booking: bookingResult.booking || bookingResult,
      paymentIntent: bookingResult.paymentIntent || null,
    };

    console.log('📤 Emitting receive_doctor_card to patient socket:', {
      socketId: patientSocket.id,
      emitPayload,
    });

    patientSocket.emit('receive_doctor_card', emitPayload);

    console.log(`✅ Doctor card sent successfully to patient: ${patientId}`);
  }

  @SubscribeMessage('request_chat')
  async handleChatRequest(@MessageBody() payload: { patientId: string }) {
    const { patientId } = payload;

    const patient = await this.chatService.getUserById(patientId);
    if (!patient) return;

    const chatSession = await this.chatService.createChatSession(patientId);

    const timestamp = new Date().toISOString();

    if (this.consultants.size === 0) {
      const patientSocket = this.patients.get(patientId);
      patientSocket?.emit('no_consultants_available', { timestamp });
    } else {
      for (const [, consultantSocket] of this.consultants) {
        consultantSocket.emit('new_chat_request', {
          sessionId: chatSession.id,
          patientId,
          patientName: patient.name,
          timestamp,
        });
      }
    }
  }

  @SubscribeMessage('accept_chat')
  async handleAcceptChat(
    @MessageBody() payload: { sessionId: string; supportId: string },
  ) {
    const updated = await this.chatService.assignConsultantToSession(
      payload.sessionId,
      payload.supportId,
    );

    if (!updated) {
      const socket = this.consultants.get(payload.supportId);
      socket?.emit('chat_already_taken', { sessionId: payload.sessionId });
      return;
    }

    const patientSocket = this.patients.get(updated.patientId);
    const consultantSocket = this.consultants.get(payload.supportId);

    patientSocket?.emit('chat_started', { sessionId: updated.id });
    consultantSocket?.emit('chat_started', { sessionId: updated.id });

    // Notify other consultants the session is taken
    for (const [id, sock] of this.consultants.entries()) {
      if (id !== payload.supportId) {
        sock.emit('chat_taken', { sessionId: updated.id });
      }
    }
  }

  @SubscribeMessage('send_message')
  handleSendMessage(
    @MessageBody()
    payload: {
      sessionId: string;
      senderId: string;
      senderName?: string;
      message: string;
      timestamp?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const messagePayload = {
      sessionId: payload.sessionId,
      senderId: payload.senderId,
      senderName: payload.senderName || 'User',
      message: payload.message,
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    // Broadcast to everyone in the session (including sender)
    this.server.to(payload.sessionId).emit('receive_message', messagePayload);
  }

  @SubscribeMessage('end_chat')
  async handleEndChat(@MessageBody() payload: { sessionId: string }) {
    await this.chatService.endChatSession(payload.sessionId);

    // Notify all users in the session
    this.server.to(payload.sessionId).emit('chat_ended', {
      sessionId: payload.sessionId,
      message: 'Chat session has ended.',
    });

    console.log(`Chat ended: ${payload.sessionId}`);
  }

  @SubscribeMessage('joinSession')
  handleJoinSession(
    @MessageBody() sessionId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(sessionId);
    console.log(`Client ${client.id} joined session ${sessionId}`);
  }
}
