import { Module } from '@nestjs/common';
import { BannersService } from './banners.service';
import { BannersController } from './banners.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseModule } from 'src/response/response.module';

@Module({
  imports: [ResponseModule],
  controllers: [BannersController],
  providers: [BannersService, PrismaService],
})
export class BannersModule {}
