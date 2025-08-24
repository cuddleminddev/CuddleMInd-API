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
    });

    if (!session) {
      throw new NotFoundException('Chat session not found or access denied');
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
