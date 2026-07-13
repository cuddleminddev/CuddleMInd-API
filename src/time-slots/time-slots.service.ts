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
      status: { in: ['pending', 'confirmed'] },
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

    const [timeslots, bookings, unavailabilities] = await Promise.all([
      this.prisma.timeslot.findMany({
        where: { ...timeslotWhere, doctor: { status: 'active' } },
      }),
      this.prisma.booking.findMany({ where: bookingWhere }),
      this.prisma.doctorUnavailability.findMany({ where: unavailabilityWhere }),
    ]);

    const slotDuration = 30; // minutes

    // Track per interval: the list of free doctors for that time.
    // The slot appears in the output as long as freeDoctors.length > 0.
    // A booking / unavailability for Doctor A does NOT block Doctor B.
    const intervalDoctorCountMap = new Map<
      string,
      { start: Date; end: Date; freeDoctors: Set<string> }
    >();

    // To implement the 1-hour buffer, we first collect all free 30-min intervals per doctor.
    const doctorFreeIntervals = new Map<string, Date[]>();

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

      // If endTime is before or equal to startTime, it means the slot crosses
      // midnight in UTC. Add one day to endTime to handle this correctly.
      if (endTime <= startTime) {
        endTime = addDays(endTime, 1);
      }

      let current = new Date(startTime);

      // Include a slot as long as a full 30-min interval fits (<=, not <).
      while (!isAfter(addMinutes(current, slotDuration), endTime)) {
        const intervalStart = new Date(current);
        const intervalEnd = addMinutes(intervalStart, slotDuration);
        current = intervalEnd;

        // Check whether THIS doctor is blocked at this interval.
        const isBookingOverlap = bookings.some((b) => {
          if (b.doctorId !== slotDoctorId) return false;
          const bTime = b.scheduledAt.getTime();
          return (
            bTime < intervalEnd.getTime() &&
            bTime + slotDuration * 60_000 > intervalStart.getTime()
          );
        });

        const isUnavailabilityOverlap = unavailabilities.some((u) => {
          if (u.doctorId !== slotDoctorId) return false;
          return (
            intervalStart < new Date(u.endTime) &&
            intervalEnd   > new Date(u.startTime)
          );
        });

        if (!isBookingOverlap && !isUnavailabilityOverlap) {
          if (!doctorFreeIntervals.has(slotDoctorId)) {
            doctorFreeIntervals.set(slotDoctorId, []);
          }
          doctorFreeIntervals.get(slotDoctorId)!.push(intervalStart);
        }
      }
    }

    // Process contiguous blocks per doctor
    for (const [doctorId, intervals] of doctorFreeIntervals.entries()) {
      // Sort intervals by time
      intervals.sort((a, b) => a.getTime() - b.getTime());
      
      let currentBlock: Date[] = [];
      
      const processBlock = () => {
        // A block must have at least 2 consecutive 30-min intervals (i.e. >= 60 mins buffer)
        if (currentBlock.length >= 2) {
          for (const start of currentBlock) {
            const key = start.toISOString();
            if (!intervalDoctorCountMap.has(key)) {
              intervalDoctorCountMap.set(key, {
                start,
                end: addMinutes(start, slotDuration),
                freeDoctors: new Set(),
              });
            }
            intervalDoctorCountMap.get(key)!.freeDoctors.add(doctorId);
          }
        }
      };

      for (let i = 0; i < intervals.length; i++) {
        if (currentBlock.length === 0) {
          currentBlock.push(intervals[i]);
        } else {
          const prev = currentBlock[currentBlock.length - 1];
          // Check if contiguous (exactly slotDuration minutes apart)
          if (intervals[i].getTime() - prev.getTime() === slotDuration * 60_000) {
            currentBlock.push(intervals[i]);
          } else {
            processBlock();
            currentBlock = [intervals[i]];
          }
        }
      }
      processBlock();
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
