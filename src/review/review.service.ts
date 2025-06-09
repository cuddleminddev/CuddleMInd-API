import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async create(patientId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { doctor: true, patient: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.patientId !== patientId)
      throw new BadRequestException(
        'You are not authorized to review this booking',
      );
    if (booking.status !== 'completed')
      throw new BadRequestException('Cannot review an incomplete consultation');

    const existing = await this.prisma.review.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existing) throw new BadRequestException('Review already submitted');

    return this.prisma.review.create({
      data: {
        patientId,
        doctorId: booking.doctorId,
        bookingId: dto.bookingId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  async getDoctorReviews(doctorId: string) {
    return this.prisma.review.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true, profilePicture: true } },
      },
    });
  }
}
