import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { eachDayOfInterval, format } from 'date-fns';

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
          status: { in: ['confirmed', 'completed'] },
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
      values: [bookings, users, chats],
    };
  }

  async getBookingLineChartByType(startDate?: Date, endDate?: Date) {
    const whereClause: any = {};
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      select: {
        createdAt: true,
        type: true,
      },
    });

    const allTypes = ['normal', 'instant', 'special', 'rebooking'];
    const dailyMap: Record<string, Record<string, number>> = {};

    // Aggregate booking counts by date and type
    for (const booking of bookings) {
      const dateKey = format(booking.createdAt, 'yyyy-MM-dd');
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = Object.fromEntries(allTypes.map((t) => [t, 0]));
      }
      dailyMap[dateKey][booking.type]++;
    }

    // Generate a list of all dates between start and end
    const fullDateRange =
      startDate && endDate
        ? eachDayOfInterval({ start: startDate, end: endDate }).map((d) =>
            format(d, 'yyyy-MM-dd'),
          )
        : Object.keys(dailyMap).sort(); // fallback to only available dates

    const datasets = allTypes.map((type) => ({
      label: type,
      data: fullDateRange.map((date) => dailyMap[date]?.[type] || 0),
    }));

    return {
      labels: fullDateRange,
      datasets,
    };
  }
}
