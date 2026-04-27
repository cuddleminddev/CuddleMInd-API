import {
    Controller,
    Get,
    Put,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { BookingSettingsService } from './booking-settings.service';
import { UpdateBookingSettingDto } from './dto/update-booking-setting.dto';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { ResponseService } from 'src/response/response.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Booking Settings')
@ApiBearerAuth()
@Controller('booking-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingSettingsController {
    constructor(
        private readonly bookingSettingsService: BookingSettingsService,
        private readonly responseService: ResponseService,
    ) { }

    @Get()
    @Roles('admin')
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
    @Roles('admin')
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
