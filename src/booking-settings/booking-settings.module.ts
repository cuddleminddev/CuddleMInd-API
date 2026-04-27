import { Module } from '@nestjs/common';
import { BookingSettingsService } from './booking-settings.service';
import { BookingSettingsController } from './booking-settings.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ResponseModule } from 'src/response/response.module';

@Module({
    imports: [PrismaModule, ResponseModule],
    controllers: [BookingSettingsController],
    providers: [BookingSettingsService],
    exports: [BookingSettingsService],
})
export class BookingSettingsModule { }
