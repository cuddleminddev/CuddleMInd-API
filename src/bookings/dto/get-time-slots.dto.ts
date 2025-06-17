import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GetTimeSlotsDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;
}
