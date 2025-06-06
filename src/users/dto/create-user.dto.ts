import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'securePassword123',
    description: 'User password (required for roles except client)',
  })
  @ValidateIf((o) => o.role !== 'client')
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    example: '+911234567890',
    description: 'Phone number (optional)',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Priority for staff assignment',
  })
  @IsInt()
  @IsOptional()
  priority?: number;

  @ApiProperty({
    example: 'admin',
    description: 'Role of the user (e.g., admin, staff, client)',
  })
  @IsString()
  role: string;

  @ApiPropertyOptional({
    enum: UserStatus,
    default: UserStatus.active,
    description: 'Status of the user',
  })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus = UserStatus.active;
}
