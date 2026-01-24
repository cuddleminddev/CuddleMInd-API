import { Module } from '@nestjs/common';
import { ContactUsService } from './contact-us.service';
import { ContactUsController } from './contact-us.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseModule } from 'src/response/response.module';

@Module({
  imports: [ResponseModule],
  controllers: [ContactUsController],
  providers: [ContactUsService, PrismaService],
})
export class ContactUsModule {}
