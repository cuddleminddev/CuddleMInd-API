import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { eachDayOfInterval } from 'date-fns';

/** Returns a Prisma DateTime range filter, always in UTC. */
function getDateFilter(startDate?: Date, endDate?: Date) {
  if (!startDate && !endDate) return undefined;
  const filter: any = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);
  return filter;
}

/** Format a Date to 'yyyy-MM-dd' using UTC values so the server timezone
 *  never shifts a day boundary. */
function utcDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) { }

  async getAdminAnalytics(startDate?: Date, endDate?: Date) {
    // For earnings / booking counts use scheduledAt (when the session happens).
    // For user counts always return totals — date range only narrows bookings.
    const scheduledAtFilter = getDateFilter(startDate, endDate);

    const [
      earnings,
      totalPatients,
      totalDoctors,
      totalBookings,
      bookingsForDistribution,
    ] = await Promise.all([
      // Earnings: sum all successful transactions in the date range
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          status: 'success',
          ...(scheduledAtFilter ? { createdAt: scheduledAtFilter } : {}),
        },
      }),
      // Always-total counts — not filtered by date (a date-range query
      // previously returned "0 patients" because no one registered that day)
      this.prisma.user.count({ where: { role: { name: 'client' } } }),
      this.prisma.user.count({ where: { role: { name: 'doctor' } } }),
      this.prisma.booking.count({
        where: {
          status: { not: 'pending' },
          ...(scheduledAtFilter ? { scheduledAt: scheduledAtFilter } : {}),
        },
      }),
      // Fetch raw bookings so we can aggregate by UTC date in JS (groupBy on
      // a DateTime column produces one row per unique timestamp, not per day)
      this.prisma.booking.findMany({
        where: {
          status: { not: 'pending' },
          ...(scheduledAtFilter ? { scheduledAt: scheduledAtFilter } : {}),
        },
        select: { scheduledAt: true },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);

    // Aggregate booking count by UTC date
    const distributionMap = new Map<string, number>();
    for (const b of bookingsForDistribution) {
      const key = utcDateKey(b.scheduledAt);
      distributionMap.set(key, (distributionMap.get(key) ?? 0) + 1);
    }
    const bookingDistribution = Array.from(distributionMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return {
      totalEarnings: earnings._sum.amount || 0,
      totalPatients,
      totalDoctors,
      totalBookings,
      bookingDistribution,
    };
  }

  async getDoctorAnalytics(doctorId: string, startDate?: Date, endDate?: Date) {
    const scheduledAtFilter = getDateFilter(startDate, endDate);

    const [earnings, totalBookings, upcomingBookings, patients] =
      await Promise.all([
        // Earnings: sum successful transactions linked to this doctor's bookings
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            status: 'success',
            booking: { doctorId },
            ...(scheduledAtFilter ? { createdAt: scheduledAtFilter } : {}),
          },
        }),
        this.prisma.booking.count({
          where: {
            doctorId,
            status: { not: 'pending' },
            ...(scheduledAtFilter ? { scheduledAt: scheduledAtFilter } : {}),
          },
        }),
        // Upcoming = confirmed bookings from now (or from startDate) onward
        this.prisma.booking.count({
          where: {
            doctorId,
            status: 'confirmed',
            scheduledAt: {
              gte: startDate && startDate > new Date() ? startDate : new Date(),
              ...(endDate ? { lte: endDate } : {}),
            },
          },
        }),
        this.prisma.booking.findMany({
          where: {
            doctorId,
            status: { not: 'pending' },
            ...(scheduledAtFilter ? { scheduledAt: scheduledAtFilter } : {}),
          },
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
    const scheduledAtFilter = getDateFilter(startDate, endDate);
    const startedAtFilter = getDateFilter(startDate, endDate);

    const [bookings, users, chats] = await Promise.all([
      this.prisma.booking.count({
        where: {
          status: { in: ['confirmed', 'completed'] },
          ...(scheduledAtFilter ? { scheduledAt: scheduledAtFilter } : {}),
        },
      }),
      // Active user total (not date-filtered — avoids showing 0 when range
      // contains no new signups)
      this.prisma.user.count({ where: { status: 'active' } }),
      this.prisma.chatSession.count({
        where: {
          status: { in: ['ongoing', 'completed'] },
          ...(startedAtFilter ? { startedAt: startedAtFilter } : {}),
        },
      }),
    ]);

    return {
      labels: ['Bookings', 'Users', 'Chats'],
      values: [bookings, users, chats],
    };
  }

  async getBookingLineChartByType(startDate?: Date, endDate?: Date) {
    const whereClause: any = { status: { not: 'pending' } };
    if (startDate && endDate) {
      whereClause.scheduledAt = { gte: startDate, lte: endDate };
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      select: { scheduledAt: true, type: true },
    });

    // Collect all actual booking types present (don't hardcode — new types
    // will be picked up automatically)
    const typeSet = new Set<string>();
    const dailyMap: Record<string, Record<string, number>> = {};

    for (const booking of bookings) {
      const dateKey = utcDateKey(booking.scheduledAt); // UTC-safe
      const type = booking.type as string;
      typeSet.add(type);
      if (!dailyMap[dateKey]) dailyMap[dateKey] = {};
      dailyMap[dateKey][type] = (dailyMap[dateKey][type] ?? 0) + 1;
    }

    const allTypes = Array.from(typeSet).sort();

    // Full date range — fill gaps with 0
    const fullDateRange =
      startDate && endDate
        ? eachDayOfInterval({ start: startDate, end: endDate }).map((d) =>
          utcDateKey(d),
        )
        : Object.keys(dailyMap).sort();

    const datasets = allTypes.map((type) => ({
      label: type,
      data: fullDateRange.map((date) => dailyMap[date]?.[type] ?? 0),
    }));

    return {
      labels: fullDateRange,
      datasets,
    };
  }
}
