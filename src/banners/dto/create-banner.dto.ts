import { IsString, IsOptional } from 'class-validator';

export class CreateBannerDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;
}
