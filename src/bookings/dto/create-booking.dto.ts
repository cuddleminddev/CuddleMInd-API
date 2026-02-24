import {
  IsUUID,
  IsDateString,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentType, SessionType, BookingType } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  @IsOptional()
  doctorId: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  patientId: string;

  @ApiProperty()
  @IsDateString()
  scheduledAt: Date;

  @ApiProperty()
  @IsNumber()
  durationMinutes: number;

  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @ApiProperty({ enum: SessionType })
  @IsEnum(SessionType)
  sessionType: SessionType;

  @ApiProperty({ enum: BookingType })
  @IsEnum(BookingType)
  type: BookingType; // Added field for manual/automatic

  @ApiProperty({
    required: false,
    description:
      'Package ID to purchase if no active plan is available (used when paymentType=plan)',
  })
  @IsString()
  @IsOptional()
  packageId?: string;
}
