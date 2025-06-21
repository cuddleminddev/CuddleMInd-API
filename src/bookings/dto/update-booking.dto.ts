import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingDto } from './create-booking.dto';
import {
  BookingStatus,
  BookingType,
  PaymentType,
  SessionType,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Whether the booking is paid' })
  isPaid?: boolean;

  @IsOptional()
  @IsEnum(BookingStatus)
  @ApiPropertyOptional({
    enum: BookingStatus,
    description: 'Status of the booking',
  })
  status?: BookingStatus;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ description: 'User Plan ID' })
  userPlanId?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ description: 'Rescheduled date and time' })
  scheduledAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ description: 'Duration in minutes' })
  durationMinutes?: number;

  @IsOptional()
  @IsEnum(PaymentType)
  @ApiPropertyOptional({ enum: PaymentType, description: 'Payment type' })
  paymentType?: PaymentType;

  @IsOptional()
  @IsEnum(SessionType)
  @ApiPropertyOptional({ enum: SessionType, description: 'Session type' })
  sessionType?: SessionType;

  @IsOptional()
  @IsEnum(BookingType)
  @ApiPropertyOptional({ enum: BookingType, description: 'Booking type' })
  type?: BookingType;
}
