import {
  IsUUID,
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class TimeRange {
  @IsString() startTime: string; // "HH:mm"
  @IsString() endTime: string;
}

class WeeklyEntry {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRange)
  timeRanges: TimeRange[];
}

export class CreateWeeklyScheduleDto {
  @IsUUID()
  doctorId: string;

  @IsString()
  timezone: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyEntry)
  weeklySchedule: WeeklyEntry[];
}
