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

  /**
   * Find or create a chat session for a patient.
   * NOTE: `chat_sessions.patient_id` is unique in DB, so only one session can
   * exist per patient until that constraint is removed via migration.
   */
  async findOrCreateChatSession(patientId: string, supportId?: string) {
    const existing = await this.prisma.chatSession.findUnique({
      where: { patientId },
    });

    if (!existing) {
      return this.prisma.chatSession.create({
        data: {
          patientId,
          supportId,
          status: supportId
            ? SessionStatusEnum.ongoing
            : SessionStatusEnum.pending,
        },
      });
    }

    return this.prisma.chatSession.update({
      where: { id: existing.id },
      data: {
        supportId: supportId ?? existing.supportId,
        status: supportId
          ? SessionStatusEnum.ongoing
          : SessionStatusEnum.pending,
        startedAt: new Date(),
        endedAt: null,
      },
    });
  }

  /**
   * Start a session for a patient
   * Uses findOrCreateChatSession to reuse existing sessions
   */
  async startSession(patientId: string): Promise<ChatSession> {
    // Get or create a session for this patient
    const session = await this.findOrCreateChatSession(patientId);
    
    // If session is not already ongoing, update it
    if (session.status !== SessionStatusEnum.ongoing) {
      return this.prisma.chatSession.update({
        where: { id: session.id },
        data: {
          status: SessionStatusEnum.ongoing,
          startedAt: new Date(),
        },
      });
    }
    
    return session;
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

    // Assign the consultant to this specific pending session.
    // Never merge into a previous session — each chat request is its own history.
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        supportId,
        status: SessionStatusEnum.ongoing,
        startedAt: new Date(),
      },
    });
  }

  /**
   * Get active or most recent session for a patient
   * Prioritizes ongoing/pending sessions, but returns completed ones if no active session exists
   */
  async getActiveSession(patientId: string, supportId?: string): Promise<ChatSession | null> {
    const where: any = { patientId };
    
    if (supportId) {
      where.supportId = supportId;
    }

    // First try to find an active session
    let session = await this.prisma.chatSession.findFirst({
      where: {
        ...where,
        status: { in: ['pending', 'ongoing'] },
      },
      orderBy: { startedAt: 'desc' },
    });

    // If no active session, return the most recent completed session
    if (!session) {
      session = await this.prisma.chatSession.findFirst({
        where,
        orderBy: { startedAt: 'desc' },
      });
    }

    return session;
  }

  /**
   * Get or resume a session between two specific users
   * This allows continuing an existing conversation
   */
  async getOrResumeSession(patientId: string, supportId: string): Promise<ChatSession> {
    return this.findOrCreateChatSession(patientId, supportId);
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

  async saveSystemEventMessage(
    sessionId: string,
    senderId: string,
    event: 'receive_consultant_info' | 'consultant_info_error',
    payload: any,
  ) {
    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        senderId,
        type: 'system',
        payload: {
          event,
          ...payload,
        },
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

  // Chat History API Methods

  /**
   * Get all chat sessions for a user with pagination and filtering
   */
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

    if (status) {
      where.status = status;
    }

    const [sessions, totalCount] = await Promise.all([
      this.prisma.chatSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
          support: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
          ChatMessage: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              message: true,
              type: true,
              createdAt: true,
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              ChatMessage: true,
            },
          },
        },
      }),
      this.prisma.chatSession.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        patient: session.patient,
        support: session.support,
        lastMessage: session.ChatMessage[0] || null,
        messageCount: session._count.ChatMessage,
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPreviousPage,
        limit,
      },
    };
  }

  /**
   * Get messages in a specific chat session with pagination
   */
  async getChatMessages(
    sessionId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    // First verify that the user has access to this session
    const session = await this.prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        OR: [{ patientId: userId }, { supportId: userId }],
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
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

    // Fetch the most recent consultation session linked to a booking between
    // the patient and the doctor (support) of this chat session, if any.
    let consultationInfo: any = null;
    if (session.supportId) {
      const booking = await this.prisma.booking.findFirst({
        where: {
          patientId: session.patientId,
          doctorId: session.supportId,
          consultationSession: { isNot: null },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          consultationSession: true,
        },
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
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.chatMessage.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

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
      messages: messages.map((message) => ({
        id: message.id,
        message: message.message,
        type: message.type,
        payload: message.payload,
        createdAt: message.createdAt,
        sender: {
          id: message.sender.id,
          name: message.sender.name,
          email: message.sender.email,
          profilePicture: message.sender.profilePicture,
          role: message.sender.role.name,
        },
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPreviousPage,
        limit,
      },
    };
  }
}
