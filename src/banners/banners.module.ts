import { Module } from '@nestjs/common';
import { BannersService } from './banners.service';
import { BannersController } from './banners.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseModule } from 'src/response/response.module';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [ResponseModule, S3Module],
  controllers: [BannersController],
  providers: [BannersService, PrismaService],
})
export class BannersModule { }
