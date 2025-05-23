import {
  IsString,
  IsOptional,
  IsEnum,
  IsISO8601,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateBookingAddressDto {
  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zip?: string;

  @IsString()
  @IsOptional()
  specialInstructions?: string;
}

export class UpdateBookingDto {
  @IsOptional()
  status?: string;

  @IsISO8601()
  @IsOptional()
  scheduledDate?: string;

  @ValidateNested()
  @Type(() => UpdateBookingAddressDto)
  @IsOptional()
  address?: UpdateBookingAddressDto;
}
