import {
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ description: 'Consultations allowed in the period' })
  @IsInt()
  @IsPositive()
  bookingFrequency: number;

  @ApiProperty({ description: 'Time period in days' })
  @IsInt()
  @IsPositive()
  timePeriod: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;
}
