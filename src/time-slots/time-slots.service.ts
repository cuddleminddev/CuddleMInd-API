import { Injectable } from '@nestjs/common';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  addMinutes,
  addDays,
  isAfter,
  set,
} from 'date-fns';
import { zonedTimeToUtc, format, utcToZonedTime } from 'date-fns-tz';
import { CreateWeeklyScheduleDto } from './dto/create-time-slot.dto';

@Injectable()
export class TimeSlotsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return `This action returns all timeSlots`;
  }

  findOne(id: number) {
    return `This action returns a #${id} timeSlot`;
  }

  update(id: number, updateTimeSlotDto: UpdateTimeSlotDto) {
    return `This action updates a #${id} timeSlot`;
  }

  remove(id: number) {
    return `This action removes a #${id} timeSlot`;
  }

  async getAvailableTimeslots(dateString: string, doctorId?: string) {
    // Always work in UTC so that dayOfWeek, startOfDay, and endOfDay are
    // consistent regardless of the server's local timezone.
    const dateUtc = new Date(dateString); // e.g. "2026-03-01" → 2026-03-01T00:00:00.000Z
    const dayOfWeek = dateUtc.getUTCDay(); // UTC day-of-week (0=Sun … 6=Sat)

    const utcDayStart = new Date(Date.UTC(
      dateUtc.getUTCFullYear(),
      dateUtc.getUTCMonth(),
      dateUtc.getUTCDate(),
      0, 0, 0, 0,
    ));
    const utcDayEnd = new Date(Date.UTC(
      dateUtc.getUTCFullYear(),
      dateUtc.getUTCMonth(),
      dateUtc.getUTCDate(),
      23, 59, 59, 999,
    ));

    const timeslotWhere: any = {
      dayOfWeek,
      isRecurring: true,
    };

    if (doctorId) {
      timeslotWhere.doctorId = doctorId;
    }

    const bookingWhere: any = {
      scheduledAt: {
        gte: utcDayStart,
        lte: utcDayEnd,
      },
      // Only confirmed bookings block a slot — pending-payment bookings do NOT
      // block display slots until payment is captured via webhook.
      status: { in: ['confirmed'] },
    };

    if (doctorId) {
      bookingWhere.doctorId = doctorId;
    }

    // Use a range instead of an exact date match so that any small timestamp
    // difference never silently drops unavailability records.
    const unavailabilityWhere: any = {
      startTime: { lt: utcDayEnd },
      endTime:   { gt: utcDayStart },
    };

    if (doctorId) {
      unavailabilityWhere.doctorId = doctorId;
    }

    const [timeslots, bookings, unavailabilities, bookingSetting] = await Promise.all([
      this.prisma.timeslot.findMany({
        where: { ...timeslotWhere, doctor: { status: 'active' } },
      }),
      this.prisma.booking.findMany({ where: bookingWhere }),
      this.prisma.doctorUnavailability.findMany({ where: unavailabilityWhere }),
      this.prisma.bookingSetting.findFirst({ where: { settingKey: 'default' } }),
    ]);

    // Duration of an actual booked session (used to test if an existing booking
    // overlaps a candidate display slot). Falls back to 30 min if settings are missing.
    const bookingSessionMinutes: number =
      bookingSetting?.bookingDurationMinutes ?? 30;

    const slotDuration = 30; // display granularity is always 30 minutes

    // Map of ISO-start → { start, end, freeDoctors }
    const intervalDoctorCountMap = new Map<
      string,
      { start: Date; end: Date; freeDoctors: Set<string> }
    >();

    for (const slot of timeslots) {
      const slotDoctorId = slot.doctorId;

      // Build the interval boundaries for this date in UTC.
      const startTime = new Date(Date.UTC(
        dateUtc.getUTCFullYear(),
        dateUtc.getUTCMonth(),
        dateUtc.getUTCDate(),
        slot.startTime.getUTCHours(),
        slot.startTime.getUTCMinutes(),
        0, 0,
      ));

      let endTime = new Date(Date.UTC(
        dateUtc.getUTCFullYear(),
        dateUtc.getUTCMonth(),
        dateUtc.getUTCDate(),
        slot.endTime.getUTCHours(),
        slot.endTime.getUTCMinutes(),
        0, 0,
      ));

      // If endTime is before or equal to startTime, the slot crosses midnight.
      // Add one day to endTime to handle this correctly.
      if (endTime <= startTime) {
        endTime = addDays(endTime, 1);
      }

      let current = new Date(startTime);

      // Show a slot as long as a full 30-min interval fits within the schedule.
      while (!isAfter(addMinutes(current, slotDuration), endTime)) {
        const intervalStart = new Date(current);
        const intervalEnd = addMinutes(intervalStart, slotDuration);
        current = intervalEnd;

        // Check whether THIS doctor has a confirmed booking overlapping this slot.
        // Use the actual booking session duration (bookingSessionMinutes) so that
        // a 60-min session at 11:30 blocks 11:30 onward but NOT 11:00.
        const isBookingOverlap = bookings.some((b) => {
          if (b.doctorId !== slotDoctorId) return false;
          const bookedStart = b.scheduledAt.getTime();
          const bookedEnd = bookedStart + bookingSessionMinutes * 60_000;
          return bookedStart < intervalEnd.getTime() && bookedEnd > intervalStart.getTime();
        });

        const isUnavailabilityOverlap = unavailabilities.some((u) => {
          if (u.doctorId !== slotDoctorId) return false;
          return (
            intervalStart < new Date(u.endTime) &&
            intervalEnd   > new Date(u.startTime)
          );
        });

        // Each free 30-min slot is shown independently.
        // No contiguous-block minimum — a single free half-hour slot is valid.
        if (!isBookingOverlap && !isUnavailabilityOverlap) {
          const key = intervalStart.toISOString();
          if (!intervalDoctorCountMap.has(key)) {
            intervalDoctorCountMap.set(key, {
              start: intervalStart,
              end: intervalEnd,
              freeDoctors: new Set(),
            });
          }
          intervalDoctorCountMap.get(key)!.freeDoctors.add(slotDoctorId);
        }
      }
    }

    // Return ISO UTC strings for frontend.
    // availableCount = number of doctors who can still take this slot.
    return Array.from(intervalDoctorCountMap.values())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map(({ start, end, freeDoctors }) => ({
        start: start.toISOString(),
        end: end.toISOString(),
        availableCount: freeDoctors.size,
      }));
  }

  async setWeeklySchedule(dto: CreateWeeklyScheduleDto) {
    const { doctorId, timezone, weeklySchedule } = dto;

    // Clear previous recurring weekly timeslots
    await this.prisma.timeslot.deleteMany({
      where: { doctorId, isRecurring: true },
    });

    const created: any[] = [];

    for (const dayEntry of weeklySchedule) {
      const { dayOfWeek, timeRanges } = dayEntry;

      for (const range of timeRanges) {
        const [sh, sm] = range.startTime.split(':').map(Number);
        const [eh, em] = range.endTime.split(':').map(Number);

        // Use a dummy date just to store the time
        const dummyDate = new Date('1970-01-01T00:00:00Z');

        const localStart = set(dummyDate, {
          hours: sh,
          minutes: sm,
          seconds: 0,
        });
        const localEnd = set(dummyDate, { hours: eh, minutes: em, seconds: 0 });

        const utcStart = zonedTimeToUtc(localStart, timezone);
        const utcEnd = zonedTimeToUtc(localEnd, timezone);

        const slot = await this.prisma.timeslot.create({
          data: {
            doctorId,
            dayOfWeek,
            startTime: utcStart,
            endTime: utcEnd,
            timezone,
            isRecurring: true,
          },
        });

        created.push(slot);
      }
    }

    return { message: 'Weekly schedule set successfully', timeslots: created };
  }

  async getWeeklySchedule(doctorId: string) {
    const timeslots = await this.prisma.timeslot.findMany({
      where: {
        doctorId,
        isRecurring: true,
      },
      orderBy: {
        dayOfWeek: 'asc',
      },
    });

    if (!timeslots.length) {
      return {
        message: 'No recurring timeslots found for this doctor',
        weeklySchedule: [],
      };
    }

    const timezone = timeslots[0].timezone;

    const groupedByDay: Record<
      number,
      { startTime: string; endTime: string }[]
    > = {};

    for (const slot of timeslots) {
      const startZoned = utcToZonedTime(slot.startTime, timezone);
      const endZoned = utcToZonedTime(slot.endTime, timezone);

      const startStr = format(startZoned, 'HH:mm', { timeZone: timezone });
      const endStr = format(endZoned, 'HH:mm', { timeZone: timezone });

      if (!groupedByDay[slot.dayOfWeek]) {
        groupedByDay[slot.dayOfWeek] = [];
      }

      groupedByDay[slot.dayOfWeek].push({
        startTime: startStr,
        endTime: endStr,
      });
    }

    const weeklySchedule = Object.entries(groupedByDay).map(
      ([day, timeRanges]) => ({
        dayOfWeek: Number(day),
        timeRanges,
      }),
    );

    return {
      doctorId,
      timezone,
      weeklySchedule,
    };
  }
}
