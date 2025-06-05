import { IsUUID, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { SessionType, PaymentType } from '@prisma/client';

export class CreateBookingDto {
  @IsUUID()
  doctorId: string;

  @IsUUID()
  patientId: string;

  @IsDateString()
  scheduledAt: Date;

  @IsInt()
  @Min(15)
  durationMinutes: number;

  @IsEnum(SessionType)
  type: SessionType;

  @IsEnum(PaymentType)
  paymentType: PaymentType;
}
