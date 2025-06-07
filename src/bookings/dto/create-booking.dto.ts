import {
  IsUUID,
  IsDateString,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentType, SessionType } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  @IsOptional()
  doctorId: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  userPlanId: string;

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
  type: SessionType;
}
