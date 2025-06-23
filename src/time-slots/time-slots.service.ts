import { Injectable } from '@nestjs/common';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  startOfDay,
  endOfDay,
  getDay,
  addMinutes,
  isBefore,
  set,
} from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';
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
    const date = new Date(dateString);
    const dayOfWeek = getDay(date); // Sunday = 0, Saturday = 6

    const timeslotWhere: any = {
      dayOfWeek,
      isRecurring: true,
    };

    if (doctorId) {
      timeslotWhere.doctorId = doctorId;
    }

    const bookingWhere: any = {
      scheduledAt: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
      status: { in: ['pending', 'confirmed'] },
    };

    if (doctorId) {
      bookingWhere.doctorId = doctorId;
    }

    const unavailabilityWhere: any = {
      date,
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
    const availableIntervals: { start: Date; end: Date }[] = [];

    for (const slot of timeslots) {
      // Apply the saved UTC times to the selected date
      const startTime = new Date(date);
      startTime.setUTCHours(
        slot.startTime.getUTCHours(),
        slot.startTime.getUTCMinutes(),
        0,
        0,
      );

      const endTime = new Date(date);
      endTime.setUTCHours(
        slot.endTime.getUTCHours(),
        slot.endTime.getUTCMinutes(),
        0,
        0,
      );

      let current = new Date(startTime);

      while (
        isBefore(addMinutes(current, slotDuration), endTime) ||
        +current === +endTime
      ) {
        const intervalStart = new Date(current);
        const intervalEnd = addMinutes(intervalStart, slotDuration);
        current = intervalEnd;

        const overlapsBooking = bookings.some((b) => {
          const bTime = b.scheduledAt.getTime();
          return (
            bTime >= intervalStart.getTime() && bTime < intervalEnd.getTime()
          );
        });

        const overlapsUnavailability = unavailabilities.some((u) => {
          return (
            intervalStart < new Date(u.endTime) &&
            intervalEnd > new Date(u.startTime)
          );
        });

        if (!overlapsBooking && !overlapsUnavailability) {
          availableIntervals.push({
            start: intervalStart,
            end: intervalEnd,
          });
        }
      }
    }

    // Return ISO UTC strings for frontend
    return availableIntervals
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map(({ start, end }) => ({
        start: start.toISOString(),
        end: end.toISOString(),
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
}
