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
  private doctors: Map<string, Socket> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly bookingService: BookingsService,
    private prisma: PrismaService,
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
    } else if (role === 'doctor') {
      this.doctors.set(userId, client);
      this.broadcastDoctorList(); // 🔄 NEW
    } else if (role === 'patient') {
      this.patients.set(userId, client);
    }

    console.log(`${role} connected: ${userId}`);
  }

  private removeClient(
    roleMap: Map<string, Socket>,
    roleName: string,
    client: Socket,
    afterRemove?: (id: string) => void,
  ): boolean {
    for (const [id, sock] of roleMap.entries()) {
      if (sock === client) {
        roleMap.delete(id);
        console.log(`${roleName} disconnected: ${id}`);
        afterRemove?.(id); // Pass id to callback
        return true;
      }
    }
    return false;
  }

  handleDisconnect(client: Socket) {
    if (this.removeClient(this.consultants, 'Consultant', client)) return;

    if (this.removeClient(this.patients, 'Patient', client)) return;

    if (
      this.removeClient(this.doctors, 'Doctor', client, (id) => {
        this.broadcastDoctorList();
        this.server.emit('doctor_disconnected', { doctorId: id });
      })
    )
      return;
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

    let bookingResult: any;
    try {
      const createBookingDto: CreateBookingDto = {
        doctorId,
        patientId,
        scheduledAt: new Date(),
        durationMinutes: 60,
        paymentType: 'one_time',
        sessionType: 'video',
        type: 'instant',
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

  @SubscribeMessage('send_doctor_info')
  async handleSendConsultantInfo(
    @MessageBody()
    payload: {
      sessionId: string;
      patientId: string;
      doctorId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, patientId, doctorId } = payload;

    const patientSocket = this.patients.get(patientId);
    if (!patientSocket) {
      console.error('❌ Patient socket not found:', patientId);
      client.emit('consultant_info_error', {
        sessionId,
        message: 'Patient is not connected',
      });
      return;
    }

    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      select: { name: true },
    });

    if (!doctor) {
      console.error('❌ Doctor not found:', doctorId);
      client.emit('consultant_info_error', {
        sessionId,
        message: 'Doctor not found',
      });
      return;
    }

    const emitPayload = {
      sessionId,
      doctorId,
      name: doctor.name,
    };

    patientSocket.emit('receive_consultant_info', emitPayload);

    console.log(`✅ Sent doctor info to patient ${patientId}:`, emitPayload);
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

    for (const [id, sock] of this.consultants.entries()) {
      if (id !== payload.supportId) {
        sock.emit('chat_taken', {
          sessionId: updated.id,
          patientId: updated.patientId, // 🔄 Added for frontend filtering
        });
      }
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody()
    payload: {
      sessionId: string;
      senderId: string;
      senderName?: string;
      message: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const savedMessage = await this.chatService.saveMessage(
        payload.sessionId,
        payload.senderId,
        payload.message,
      );

      const emitPayload = {
        sessionId: payload.sessionId,
        senderId: savedMessage.senderId,
        senderName: savedMessage.sender.name,
        message: savedMessage.message,
        timestamp: savedMessage.createdAt,
      };

      this.server.to(payload.sessionId).emit('receive_message', emitPayload);
    } catch (error) {
      console.error('❌ Error saving message:', error);
      client.emit('message_error', {
        message: 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('end_chat')
  async handleEndChat(@MessageBody() payload: { sessionId: string }) {
    await this.chatService.endChatSession(payload.sessionId);

    this.server.to(payload.sessionId).emit('chat_ended', {
      sessionId: payload.sessionId,
      message: 'Chat session has ended.',
    });

    console.log(`Chat ended: ${payload.sessionId}`);
  }

  @SubscribeMessage('joinSession')
  async handleJoinSession(
    @MessageBody() sessionId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(sessionId);
    console.log(`Client ${client.id} joined session ${sessionId}`);

    const messages = await this.chatService.getMessagesBySession(sessionId);
    client.emit('chat_history', messages);
  }

  @SubscribeMessage('get_connected_doctors')
  handleGetConnectedDoctors(@ConnectedSocket() client: Socket) {
    const connectedDoctorIds = Array.from(this.doctors.keys());
    client.emit('connected_doctors_list', connectedDoctorIds);
  }

  private broadcastDoctorList() {
    const connectedDoctorIds = Array.from(this.doctors.keys());
    this.server.emit('connected_doctors_list', connectedDoctorIds);
  }

  @SubscribeMessage('rejoin_session')
  async handleRejoinSession(
    @MessageBody() payload: { sessionId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = await this.chatService.getSessionById(payload.sessionId);
    if (!session) {
      client.emit('rejoin_error', { message: 'Session not found' });
      return;
    }

    client.join(payload.sessionId);
    const messages = await this.chatService.getMessagesBySession(
      payload.sessionId,
    );

    client.emit('chat_history', messages);
    client.emit('rejoined_session', { sessionId: payload.sessionId });
  }

  notifyDoctorOfInstantSession(doctorId: string, payload: any) {
    const doctorSocket = this.doctors.get(doctorId);
    if (doctorSocket) {
      doctorSocket.emit('instant_session_started', payload);
      console.log(`🔔 Notified doctor ${doctorId} of instant session`);
    } else {
      console.warn(`⚠️ Doctor ${doctorId} not connected via WebSocket`);
    }
  }
}
