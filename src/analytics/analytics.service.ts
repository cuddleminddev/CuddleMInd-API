import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminAnalytics() {
    const [
      earnings,
      totalPatients,
      totalDoctors,
      totalBookings,
      bookingDistribution,
    ] = await Promise.all([
      this.prisma.booking.aggregate({
        _sum: { amount: true },
        where: { isPaid: true },
      }),
      this.prisma.user.count({
        where: { role: { name: 'client' } },
      }),
      this.prisma.user.count({
        where: { role: { name: 'doctor' } },
      }),
      this.prisma.booking.count(),
      this.prisma.booking.groupBy({
        by: ['scheduledAt'],
        _count: true,
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);

    return {
      totalEarnings: earnings._sum.amount || 0,
      totalPatients,
      totalDoctors,
      totalBookings,
      bookingDistribution: bookingDistribution.map((entry) => ({
        date: entry.scheduledAt,
        count: entry._count,
      })),
    };
  }

  async getDoctorAnalytics(doctorId: string) {
    const [earnings, totalBookings, upcomingBookings, patients] =
      await Promise.all([
        this.prisma.booking.aggregate({
          _sum: { amount: true },
          where: { doctorId, isPaid: true },
        }),
        this.prisma.booking.count({ where: { doctorId } }),
        this.prisma.booking.count({
          where: {
            doctorId,
            scheduledAt: { gte: new Date() },
            status: 'confirmed',
          },
        }),
        this.prisma.booking.findMany({
          where: { doctorId },
          select: { patientId: true },
          distinct: ['patientId'],
        }),
      ]);

    return {
      totalEarnings: earnings._sum.amount || 0,
      totalBookings,
      upcomingBookings,
      patientCount: patients.length,
    };
  }
}
