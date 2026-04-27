import {
    Controller,
    Get,
    Put,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { BookingSettingsService } from './booking-settings.service';
import { UpdateBookingSettingDto } from './dto/update-booking-setting.dto';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
} from '@nestjs/swagger';
import { ResponseService } from 'src/response/response.service';

@ApiTags('Booking Settings')
@Controller('booking-settings')
export class BookingSettingsController {
    constructor(
        private readonly bookingSettingsService: BookingSettingsService,
        private readonly responseService: ResponseService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get booking settings' })
    @ApiResponse({
        status: 200,
        description: 'Booking settings retrieved successfully',
    })
    async getSettings() {
        const settings = await this.bookingSettingsService.getSettings();
        return this.responseService.successResponse(
            'Booking settings retrieved successfully',
            settings,
        );
    }

    @Put()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update booking settings' })
    @ApiResponse({
        status: 200,
        description: 'Booking settings updated successfully',
    })
    async updateSettings(
        @Body() updateBookingSettingDto: UpdateBookingSettingDto,
    ) {
        const updated =
            await this.bookingSettingsService.updateSettings(
                updateBookingSettingDto,
            );
        return this.responseService.successResponse(
            'Booking settings updated successfully',
            updated,
        );
    }
}
