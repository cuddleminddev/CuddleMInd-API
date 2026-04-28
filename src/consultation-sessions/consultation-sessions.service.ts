import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConsultationSessionDto } from './dto/create-consultation-session.dto';
import { UpdateConsultationSessionDto } from './dto/update-consultation-session.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatGateway } from 'src/chat/chat.gateway';
import { BookingType } from '@prisma/client';

@Injectable()
export class ConsultationSessionsService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway, // Inject gateway here
  ) { }

  async startSession(bookingId: string, createdBy: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { doctor: true, patient: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const existing = await this.prisma.consultationSession.findUnique({
      where: { bookingId },
    });

    const session =
      existing ??
      (await this.prisma.consultationSession.create({
        data: {
          bookingId,
          date: new Date(),
          status: 'pending',
          sessionType: booking.sessionType,
          zegocloudRoomId: `zego-${bookingId}`,
          createdBy,
        },
      }));

    // Notify doctor from /consultation-sessions/start only if payment completed
    if (booking.type === BookingType.instant) {
      if (booking.isPaid) {
        this.chatGateway.notifyDoctorOfInstantSession(booking.doctorId, {
          sessionId: booking.id,
          patientId: booking.patientId,
          patientName: booking.patient?.name ?? '',
          doctorId: booking.doctorId,
          bookingId: booking.id,
          sessionType: booking.sessionType,
          bookingType: booking.type,
          paymentStatus: 'paid',
          zegocloudRoomId: session.zegocloudRoomId ?? `zego-${bookingId}`,
          scheduledAt: booking.scheduledAt,
        });
      } else {
        console.log(`⏳ startSession: instant booking ${bookingId} not paid — skipping doctor notify`);
      }
    }

    return session;
  }

  async connectSession(bookingId: string) {
    return this.prisma.consultationSession.update({
      where: { bookingId },
      data: {
        status: 'ongoing',
        startedAt: new Date(),
      },
    });
  }

  async endSession(bookingId: string, endedBy: string, notes?: string) {
    const session = await this.prisma.consultationSession.findUnique({
      where: { bookingId },
    });

    if (!session) throw new NotFoundException('Session not found');

    const now = new Date();
    const startedAt = session.startedAt || now;
    const duration = Math.round((+now - +startedAt) / 60000);

    return this.prisma.consultationSession.update({
      where: { bookingId },
      data: {
        status: 'completed',
        endedAt: now,
        durationInMinutes: duration,
        endedBy,
        notes,
      },
    });
  }
}
