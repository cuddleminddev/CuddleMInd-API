import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionStatusEnum } from '@prisma/client';

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
}
