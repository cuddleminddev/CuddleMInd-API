import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatSession } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Session Management ──────────────────────────────────────────────────────

  /**
   * Get or create the single persistent chat session for a patient.
   *
   * Every patient has exactly ONE chat session (enforced by the unique
   * constraint on ChatSession.patientId). When a patient requests a chat
   * or reconnects, we always return (or create) that single session.
   *
   * Staff join/leave the SAME session — no new session is created on each
   * `accept_chat`. The `supportId` is updated to whoever is currently
   * handling the chat.
   */
  async findOrCreateChatSession(patientId: string): Promise<ChatSession> {
    // Use raw findFirst + create to avoid the @unique constraint requirement
    // on `patientId` before the migration runs on production. After migration
    // this can be simplified to a plain upsert({ where: { patientId } }).
    const existing = await this.prisma.chatSession.findFirst({
      where: { patientId },
      orderBy: { startedAt: 'asc' },
    });

    if (existing) {
      // Reopen if it was completed / cancelled
      if (existing.status === 'completed' || existing.status === 'canceled') {
        return this.prisma.chatSession.update({
          where: { id: existing.id },
          data: { status: 'pending', endedAt: null },
        });
      }
      return existing;
    }

    return this.prisma.chatSession.create({
      data: { patientId, status: 'pending' },
    });
  }

  /**
   * Assign a consultant/staff member to the patient's single session.
   * Overwrites any previous support assignment so the latest person is
   * always the active handler.
   */
  async assignConsultantToSession(
    sessionId: string,
    supportId: string,
  ): Promise<ChatSession | null> {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    // Double-click guard: same support already handling this ongoing session
    if (session.status === 'ongoing' && session.supportId === supportId) {
      return null;
    }

    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        supportId,
        status: 'ongoing',
        startedAt: new Date(),
        endedAt: null,
      },
    });
  }

  async endChatSession(sessionId: string): Promise<ChatSession> {
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'completed', endedAt: new Date() },
    });
  }

  async getSessionById(sessionId: string): Promise<ChatSession | null> {
    return this.prisma.chatSession.findUnique({ where: { id: sessionId } });
  }

  // ─── Messages ────────────────────────────────────────────────────────────────

  async saveMessage(sessionId: string, senderId: string, message: string) {
    return this.prisma.chatMessage.create({
      data: { sessionId, senderId, message },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });
  }

  /**
   * Get the last 100 messages in a session (used on joinSession / reconnect).
   */
  async getMessagesBySession(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        sender: { select: { id: true, name: true, role: true } },
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

  // ─── Helper / Lookup ─────────────────────────────────────────────────────────

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
  }

  async getDoctorCardData(doctorId: string) {
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      include: { doctorProfile: true },
    });
    if (!doctor) return null;
    return {
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      profilePicture: doctor.profilePicture,
    };
  }

  async getMessagesBySender(senderId: string) {
    const senderSessions = await this.prisma.chatMessage.findMany({
      where: {
        senderId,
        session: { status: 'ongoing' },
      },
      select: { sessionId: true },
      distinct: ['sessionId'],
    });

    const sessionIds = senderSessions.map((m) => m.sessionId);
    if (sessionIds.length === 0) return [];

    return this.prisma.chatMessage.findMany({
      where: { sessionId: { in: sessionIds } },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        session: { select: { id: true, status: true } },
      },
    });
  }

  // ─── REST History API ─────────────────────────────────────────────────────────

  async getChatSessions(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      OR: [{ patientId: userId }, { supportId: userId }],
    };
    if (status) where.status = status;

    const [sessions, totalCount] = await Promise.all([
      this.prisma.chatSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          patient: {
            select: { id: true, name: true, email: true, profilePicture: true },
          },
          support: {
            select: { id: true, name: true, email: true, profilePicture: true },
          },
          ChatMessage: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              message: true,
              type: true,
              createdAt: true,
              sender: { select: { id: true, name: true } },
            },
          },
          _count: { select: { ChatMessage: true } },
        },
      }),
      this.prisma.chatSession.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        status: s.status,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        patient: s.patient,
        support: s.support,
        lastMessage: s.ChatMessage[0] || null,
        messageCount: s._count.ChatMessage,
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit,
      },
    };
  }

  async getChatMessages(
    sessionId: string,
    userId: string,
    page: number = 1,
    limit: number = 100,
  ) {
    const session = await this.prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        OR: [{ patientId: userId }, { supportId: userId }],
      },
      include: {
        patient: {
          select: { id: true, name: true, email: true, profilePicture: true },
        },
        support: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            doctorProfile: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found or access denied');
    }

    let consultationInfo: any = null;
    if (session.supportId) {
      const booking = await this.prisma.booking.findFirst({
        where: {
          patientId: session.patientId,
          doctorId: session.supportId,
          consultationSession: { isNot: null },
        },
        orderBy: { createdAt: 'desc' },
        include: { consultationSession: true },
      });
      if (booking?.consultationSession) {
        consultationInfo = booking.consultationSession;
      }
    }

    const skip = (page - 1) * limit;
    const where = { sessionId };

    const [messages, totalCount] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
              role: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.chatMessage.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      sessionInfo: {
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        doctor: session.support ?? null,
        patient: session.patient ?? null,
        consultationInfo,
      },
      messages: messages.map((m) => ({
        id: m.id,
        message: m.message,
        type: m.type,
        payload: m.payload,
        createdAt: m.createdAt,
        sender: {
          id: m.sender.id,
          name: m.sender.name,
          email: m.sender.email,
          profilePicture: m.sender.profilePicture,
          role: m.sender.role.name,
        },
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit,
      },
    };
  }
}
