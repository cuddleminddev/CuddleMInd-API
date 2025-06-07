// src/bookings/bookings.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ResponseService } from 'src/response/response.service';
import { GetTimeSlotsDto } from './dto/get-time-slots.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking (One-time or Plan)' })
  @ApiResponse({
    status: 201,
    description: 'Booking created or payment intent returned.',
  })
  async create(@Body() createBookingDto: CreateBookingDto) {
    const result = await this.bookingsService.create(createBookingDto);
    return this.responseService.successResponse(
      'Booking processed successfully.',
      result,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all bookings' })
  @ApiResponse({
    status: 200,
    description: 'List of bookings retrieved successfully.',
  })
  async listBookings(
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
  ) {
    const bookings = await this.bookingsService.findAll({
      patientId,
      doctorId,
    });
    return this.responseService.successResponse(
      'Bookings retrieved successfully',
      bookings,
    );
  }

  @Get('/timeslots')
  @Public()
  @ApiOperation({ summary: 'List available time slots for a doctor on a date' })
  async getAvailableTimeSlots(@Query() dto: GetTimeSlotsDto) {
    const timeslots = await this.bookingsService.getAvailableTimeSlots(dto);
    return this.responseService.successResponse(
      'Available timeslots listed',
      timeslots,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully.' })
  async getBookingById(@Param('id') id: string) {
    const booking = await this.bookingsService.findOne(id);
    return this.responseService.successResponse(
      'Booking retrieved successfully',
      booking,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking updated successfully.' })
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    const updated = await this.bookingsService.update(id, updateBookingDto);
    return this.responseService.successResponse(
      'Booking updated successfully',
      updated,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking deleted successfully.' })
  async remove(@Param('id') id: string) {
    const removed = await this.bookingsService.remove(id);
    return this.responseService.successResponse(
      'Booking deleted successfully',
      removed,
    );
  }
}
