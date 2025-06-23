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
  Req,
  ForbiddenException,
  UnauthorizedException,
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
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';
import { PlansService } from 'src/plans/plans.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly responseService: ResponseService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles('client')
  @Post()
  @ApiOperation({ summary: 'Create a new booking (One-time or Plan)' })
  @ApiResponse({
    status: 201,
    description: 'Booking created or payment intent returned.',
  })
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Req() req: Request,
  ) {
    const clientId = (req.user as any).id;

    const result = await this.bookingsService.create(
      createBookingDto,
      clientId,
    );
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
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const bookings = await this.bookingsService.findAll({
      patientId,
      doctorId,
      fromDate,
      toDate,
    });
    return this.responseService.successResponse(
      'Bookings retrieved successfully',
      bookings,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('next')
  async getNextBooking(@Req() req: Request) {
    const user = req.user as { id: string; role: string };
    console.log(user);
    if (!user || !user.id || !['doctor', 'client'].includes(user.role)) {
      throw new UnauthorizedException('User role not permitted or invalid');
    }

    return this.bookingsService.getNextBooking(
      user.id,
      user.role as 'doctor' | 'client',
    );
  }

  @UseGuards(RolesGuard)
  @Roles('doctor')
  @Get('doctor/upcoming')
  @ApiOperation({ summary: 'List Upcomming Bookings for  Doctors' })
  async getDoctorUpcomingBookings(@Req() req: Request) {
    const doctorId = (req.user as any).id;
    const data =
      await this.bookingsService.getUpcomingBookingsForDoctor(doctorId);
    return this.responseService.successResponse('upcoming bookings list', data);
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
