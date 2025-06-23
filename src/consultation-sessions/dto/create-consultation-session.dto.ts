import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateConsultationSessionDto {}

export class StartConsultationDto {
  @IsUUID()
  bookingId: string;

  @IsUUID()
  createdBy: string;
}

export class ConnectConsultationDto {
  @IsUUID()
  bookingId: string;
}

export class EndConsultationDto {
  @IsUUID()
  bookingId: string;

  @IsUUID()
  endedBy: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
