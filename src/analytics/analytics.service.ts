import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

function getDateFilter(startDate?: Date, endDate?: Date) {
  if (!startDate && !endDate) return undefined;

  const filter: any = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);
  return filter;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminAnalytics(startDate?: Date, endDate?: Date) {
    const dateFilter = getDateFilter(startDate, endDate);

    const [
      earnings,
      totalPatients,
      totalDoctors,
      totalBookings,
      bookingDistribution,
    ] = await Promise.all([
      this.prisma.booking.aggregate({
        _sum: { amount: true },
        where: { isPaid: true, createdAt: dateFilter },
      }),
      this.prisma.user.count({
        where: { role: { name: 'client' }, createdAt: dateFilter },
      }),
      this.prisma.user.count({
        where: { role: { name: 'doctor' }, createdAt: dateFilter },
      }),
      this.prisma.booking.count({ where: { createdAt: dateFilter } }),
      this.prisma.booking.groupBy({
        by: ['scheduledAt'],
        where: { createdAt: dateFilter },
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

  async getDoctorAnalytics(doctorId: string, startDate?: Date, endDate?: Date) {
    const dateFilter = getDateFilter(startDate, endDate);

    const [earnings, totalBookings, upcomingBookings, patients] =
      await Promise.all([
        this.prisma.booking.aggregate({
          _sum: { amount: true },
          where: { doctorId, isPaid: true, createdAt: dateFilter },
        }),
        this.prisma.booking.count({
          where: { doctorId, createdAt: dateFilter },
        }),
        this.prisma.booking.count({
          where: {
            doctorId,
            scheduledAt: { gte: new Date() },
            status: 'confirmed',
          },
        }),
        this.prisma.booking.findMany({
          where: { doctorId, createdAt: dateFilter },
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

  async getPieChartDistributionChartJs(startDate?: Date, endDate?: Date) {
    const dateFilter = getDateFilter(startDate, endDate);

    const [bookings, users, chats] = await Promise.all([
      this.prisma.booking.count({
        where: {
          status:{in:['confirmed','completed']},
          createdAt: dateFilter,
        },
      }),
      this.prisma.user.count({
        where: { status: 'active', createdAt: dateFilter },
      }),
      this.prisma.chatSession.count({
        where: {
          status: { in: ['ongoing', 'completed'] },
          startedAt: dateFilter,
        },
      }),
    ]);

    return {
      labels: ['Bookings', 'Users', 'Chats'],
      datasets: [
        {
          label: 'System Distribution',
          data: [bookings, users, chats],
          backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
        },
      ],
    };
  }

  async getBookingLineChartByType(startDate?: Date, endDate?: Date) {
    const whereClause: any = {};
    if (startDate && endDate) {
      whereClause.scheduledAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      select: {
        scheduledAt: true,
        type: true,
      },
    });

    // Group bookings by date and type
    const dailyMap: Record<string, Record<string, number>> = {};

    for (const booking of bookings) {
      const dateKey = booking.scheduledAt.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) dailyMap[dateKey] = {};
      if (!dailyMap[dateKey][booking.type]) dailyMap[dateKey][booking.type] = 0;

      dailyMap[dateKey][booking.type]++;
    }

    const allDates = Object.keys(dailyMap).sort();
    const allTypes = ['normal', 'instant', 'special', 'rebooking'];

    const datasets = allTypes.map((type, index) => ({
      label: type,
      data: allDates.map((date) => dailyMap[date]?.[type] || 0),
      borderColor: ['#36A2EB', '#FF6384', '#4BC0C0', '#9966FF'][index],
      fill: false,
    }));

    return {
      labels: allDates,
      datasets,
    };
  }
}
