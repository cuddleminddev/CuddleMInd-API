import { IsOptional, IsInt, IsDecimal, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBookingSettingDto {
    @ApiProperty({
        description: 'Booking duration in minutes',
        example: 30,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    bookingDurationMinutes?: number;

    @ApiProperty({
        description: 'Booking charge amount',
        example: 100.0,
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    bookingCharge?: number;
}
