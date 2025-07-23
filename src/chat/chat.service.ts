import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatSession, SessionStatusEnum } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async createChatSession(patientId: string) {
    return await this.prisma.chatSession.create({
      data: {
        patientId,
        status: SessionStatusEnum.pending,
      },
    });
  }

  async startSession(patientId: string): Promise<ChatSession> {
    const existing = await this.prisma.chatSession.findFirst({
      where: {
        patientId,
        status: { in: ['pending', 'ongoing'] },
      },
    });
    if (existing) throw new ConflictException('Chat already in progress');

    const support = await this.findAvailableSupport(); // define this logic
    return this.prisma.chatSession.create({
      data: {
        patientId,
        //supportId: support?.id,
        status: 'ongoing',
      },
    });
  }

  findAvailableSupport() {
    throw new Error('Method not implemented.');
  }

  async assignConsultantToSession(sessionId: string, supportId: string) {
    // Check if the session exists and is still pending
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    if (session.status !== SessionStatusEnum.pending) {
      return null; // Indicates session was already taken
    }

    // Assign the consultant
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        supportId,
        status: SessionStatusEnum.ongoing,
        startedAt: new Date(),
      },
    });
  }

  async getActiveSession(patientId: string): Promise<ChatSession | null> {
    return this.prisma.chatSession.findFirst({
      where: {
        patientId,
        status: { in: ['pending', 'ongoing'] },
      },
    });
  }

  async endChatSession(sessionId: string) {
    // You can also check if session exists before update if needed
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatusEnum.completed,
        endedAt: new Date(),
      },
    });
  }

  async getDoctorCardData(doctorId: string) {
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor) return null;

    return {
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      profilePicture: doctor.profilePicture,
    };
  }

  async saveMessage(sessionId: string, senderId: string, message: string) {
    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        senderId,
        message,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });
  }

  async getSessionById(sessionId: string) {
    return this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
  }

  async getMessagesBySession(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });
  }

  async saveDoctorCardMessage(
    sessionId: string,
    senderId: string,
    doctorData: any,
  ) {
    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        senderId,
        type: 'doctor_card',
        payload: doctorData,
      },
      include: {
        sender: { select: { name: true } },
      },
    });
  }

  //Helper Functions

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
  }

  async getMessagesBySender(senderId: string) {
    // Step 1: Find all sessionIds where sender has messages in ongoing sessions
    const senderSessions = await this.prisma.chatMessage.findMany({
      where: {
        senderId,
        session: {
          status: 'ongoing',
        },
      },
      select: {
        sessionId: true,
      },
      distinct: ['sessionId'],
    });

    const sessionIds = senderSessions.map((msg) => msg.sessionId);

    if (sessionIds.length === 0) return [];

    // Step 2: Fetch all messages in those sessions
    return this.prisma.chatMessage.findMany({
      where: {
        sessionId: { in: sessionIds },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        session: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }
}
