import { IsUUID, IsOptional, IsISO8601, IsNotEmpty } from 'class-validator';

export class GetAvailableTimeslotsDto {
  @IsISO8601()
  @IsNotEmpty()
  date: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;
}
