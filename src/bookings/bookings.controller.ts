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
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UnauthorizedException } from '@nestjs/common';

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
    description: 'Booking created or payment order returned.',
  })
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Req() req: Request,
  ) {
    const clientId = (req.user as any).id;
    const result = await this.bookingsService.creaate(createBookingDto, clientId);
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

  @Get('next')
  async getNextBooking(@Req() req: Request) {
    const user = req.user as { id: string; role: string };

    if (!user || !user.id || !['doctor', 'client'].includes(user.role)) {
      throw new UnauthorizedException('User role not permitted or invalid');
    }

    const result = await this.bookingsService.getNextBooking(
      user.id,
      user.role as 'doctor' | 'client',
    );
    return this.responseService.successResponse('Next booking fetched', result);
  }

  @UseGuards(RolesGuard)
  @Roles('doctor')
  @Get('doctor/upcoming')
  @ApiOperation({ summary: 'List upcoming bookings for doctors' })
  async getDoctorUpcomingBookings(@Req() req: Request) {
    const doctorId = (req.user as any).id;
    const data =
      await this.bookingsService.getUpcomingBookingsForDoctor(doctorId);
    return this.responseService.successResponse('Upcoming bookings list', data);
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
