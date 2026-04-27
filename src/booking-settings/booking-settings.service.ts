import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateBookingSettingDto } from './dto/update-booking-setting.dto';

@Injectable()
export class BookingSettingsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get the default booking settings (singleton pattern - only one instance exists)
     */
    async getSettings() {
        const settings = await this.prisma.bookingSetting.findFirst({
            where: { settingKey: 'default' },
        });

        if (!settings) {
            throw new NotFoundException('Booking settings not found');
        }

        return settings;
    }

    /**
     * Update the default booking settings
     */
    async updateSettings(updateBookingSettingDto: UpdateBookingSettingDto) {
        const existingSettings = await this.prisma.bookingSetting.findFirst({
            where: { settingKey: 'default' },
        });

        if (!existingSettings) {
            throw new NotFoundException('Booking settings not found');
        }

        const updated = await this.prisma.bookingSetting.update({
            where: { id: existingSettings.id },
            data: {
                ...(updateBookingSettingDto.bookingDurationMinutes !== undefined && {
                    bookingDurationMinutes:
                        updateBookingSettingDto.bookingDurationMinutes,
                }),
                ...(updateBookingSettingDto.bookingCharge !== undefined && {
                    bookingCharge: updateBookingSettingDto.bookingCharge,
                }),
            },
        });

        return updated;
    }
}
