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
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { BookingsService } from 'src/bookings/bookings.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookingDto } from 'src/bookings/dto/create-booking.dto';
import { SessionType, PaymentType, BookingType } from '@prisma/client';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private consultants: Map<string, Socket> = new Map();
  private patients: Map<string, Socket> = new Map();
  private doctors: Map<string, Socket> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly bookingService: BookingsService,
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) { }

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
      this.eventEmitter.emit('doctor.online', { doctorId: userId });
      this.broadcastDoctorList();
    } else if (role === 'patient' || role === 'client') {
      // Accept both 'patient' and 'client' — mobile/web may send either
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
        this.eventEmitter.emit('doctor.offline', { doctorId: id });
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
        paymentType: PaymentType.one_time,
        sessionType: SessionType.video,
        type: BookingType.instant,
      };

      console.log(
        '📦 Sending createBookingDto to bookingService.create:',
        createBookingDto,
      );

      bookingResult = await this.bookingService.create(
        createBookingDto,
        patientId,
      );

      await this.chatService.saveDoctorCardMessage(sessionId, doctorId, {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        profilePicture: doctor.profilePicture,
      });

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
      // bookingService.create returns `paymentOrder` for one_time payments.
      // It contains { orderId, amount, currency, keyId } needed by Razorpay SDK.
      paymentOrder: bookingResult.paymentOrder ?? null,
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

    // Find or create a session for this patient (no support assigned yet)
    const chatSession = await this.chatService.findOrCreateChatSession(patientId);

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
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
      },
    });

    if (!doctor) {
      console.error('❌ Doctor not found:', doctorId);
      client.emit('consultant_info_error', {
        sessionId,
        message: 'Doctor not found',
      });
      return;
    }

    // Persist as a doctor_card message so it appears in chat history API
    await this.chatService.saveDoctorCardMessage(sessionId, doctorId, {
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      profilePicture: doctor.profilePicture,
    });

    const emitPayload = {
      sessionId,
      doctorId,
      name: doctor.name,
      email: doctor.email,
      profilePicture: doctor.profilePicture,
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
    console.log(sessionId, messages);
    client.emit('chat_history', messages);
  }

  @SubscribeMessage('get_connected_doctors')
  async handleGetConnectedDoctors(@ConnectedSocket() client: Socket) {
    const doctors = await this.buildDoctorList();
    client.emit('connected_doctors_list', doctors);
  }

  private async buildDoctorList() {
    const connectedDoctorIds = Array.from(this.doctors.keys());
    if (connectedDoctorIds.length === 0) return [];

    const doctors = await this.prisma.user.findMany({
      where: { id: { in: connectedDoctorIds }, status: 'active' },
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
        doctorProfile: {
          select: {
            audioConsultationCharge: true,
            videoConsultationCharge: true,
          },
        },
      },
    });

    return doctors.map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      profilePicture: d.profilePicture,
      audioConsultationCharge: d.doctorProfile?.audioConsultationCharge ?? null,
      videoConsultationCharge: d.doctorProfile?.videoConsultationCharge ?? null,
    }));
  }

  private async broadcastDoctorList() {
    const doctors = await this.buildDoctorList();
    this.server.emit('connected_doctors_list', doctors);
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

  getConnectedDoctorIds(): string[] {
    return Array.from(this.doctors.keys());
  }

  /**
   * Called by StripeService (via EventEmitter) when a payment is confirmed.
   * Emits `payment_confirmed` to the patient and `instant_session_started` to the doctor.
   */
  @OnEvent('payment.confirmed')
  async handlePaymentConfirmed(payload: {
    patientId: string;
    bookingId: string;
    scheduledAt: Date;
    doctorId: string;
    sessionType?: string;
  }) {
    // ── 1. Notify patient ─────────────────────────────────────────────────
    const patientSocket = this.patients.get(payload.patientId);
    if (!patientSocket) {
      console.warn(`⚠️ [payment.confirmed] Patient ${payload.patientId} not connected`);
    } else {
      patientSocket.emit('payment_confirmed', {
        bookingId: payload.bookingId,
        status: 'confirmed',
        scheduledAt: payload.scheduledAt,
        doctorId: payload.doctorId,
      });
      console.log(`🔔 [payment.confirmed] Emitted to patient ${payload.patientId}`);
    }

    // ── 2. Notify doctor immediately — no DB await ────────────────────────
    // zegocloudRoomId is deterministic from bookingId so we don't need the
    // DB upsert to succeed before pushing the event to the doctor.
    const zegocloudRoomId = `zego-${payload.bookingId}`;

    // Fetch patient name (best-effort, non-blocking)
    let patientName = '';
    try {
      const patient = await this.prisma.user.findUnique({
        where: { id: payload.patientId },
        select: { name: true },
      });
      patientName = patient?.name ?? '';
    } catch {
      console.warn(`⚠️ [payment.confirmed] Could not fetch patient name for ${payload.patientId}`);
    }

    this.notifyDoctorOfInstantSession(payload.doctorId, {
      sessionId: payload.bookingId,
      patientId: payload.patientId,
      patientName,
      doctorId: payload.doctorId,
      bookingId: payload.bookingId,
      sessionType: payload.sessionType ?? 'video',
      zegocloudRoomId,
      scheduledAt: payload.scheduledAt,
    });

    // ── 3. Persist zegocloudRoomId on consultation session (fire-and-forget) ─
    this.prisma.consultationSession.upsert({
      where: { bookingId: payload.bookingId },
      update: { zegocloudRoomId },
      create: {
        bookingId: payload.bookingId,
        date: payload.scheduledAt,
        status: 'pending',
        sessionType: (payload.sessionType as SessionType) ?? SessionType.video,
        zegocloudRoomId,
      },
    }).then((session) => {
      console.log(`✅ [payment.confirmed] Consultation session upserted, id: ${session.id}`);
    }).catch((err) => {
      console.error('❌ [payment.confirmed] Failed to upsert consultation session:', err);
    });
  }

  /**
   * Called by StripeService (via EventEmitter) when a payment fails.
   * Emits `payment_failed` to the patient's socket.
   */
  @OnEvent('payment.failed')
  handlePaymentFailed(payload: {
    patientId: string;
    bookingId: string;
    reason: string;
  }) {
    const patientSocket = this.patients.get(payload.patientId);
    if (!patientSocket) {
      console.warn(`⚠️ [payment.failed] Patient ${payload.patientId} not connected`);
      return;
    }
    patientSocket.emit('payment_failed', {
      bookingId: payload.bookingId,
      status: 'failed',
      reason: payload.reason,
    });
    console.log(`🔔 [payment.failed] Emitted to patient ${payload.patientId}`);
  }

  notifyPaymentResult(
    patientId: string,
    status: 'confirmed' | 'failed',
    bookingId: string,
    extra?: Record<string, any>,
  ) {
    const patientSocket = this.patients.get(patientId);
    if (!patientSocket) {
      console.warn(`⚠️ [notify] Patient ${patientId} not connected — cannot push payment result`);
      return;
    }

    const event = status === 'confirmed' ? 'payment_confirmed' : 'payment_failed';
    const payload = { bookingId, status, ...extra };
    patientSocket.emit(event, payload);
    console.log(`🔔 [notify] Emitted '${event}' to patient ${patientId}:`, payload);
  }
}
