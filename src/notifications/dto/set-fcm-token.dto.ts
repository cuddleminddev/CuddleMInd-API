import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetFcmTokenDto {
  @ApiProperty({ description: 'Firebase Cloud Messaging device token' })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
