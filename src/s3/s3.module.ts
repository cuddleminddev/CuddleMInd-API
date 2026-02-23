import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { S3Controller } from './s3.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [S3Controller],
  providers: [S3Service],
  exports: [S3Service], // Export S3Service so other modules can use it
})
export class S3Module {}
