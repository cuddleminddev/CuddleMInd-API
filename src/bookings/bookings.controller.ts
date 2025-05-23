import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  Prisma,
} from '@prisma/client';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ResponseService } from 'src/response/response.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { PaymentsService } from 'src/payments/payments.service';
import { stringify } from 'querystring';
import { RescheduleDto } from './dto/reschedule.dto';

function getFirstDayOfNextMonth(): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  return new Date(year, month + 1, 1);
}

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly responseService: ResponseService,
    private readonly usersService: UsersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  async findAll(
    @Request() req,
   
  ) {
    //const param: Partial<Booking> = {};


    const bookings = await this.bookingsService.findAll(
      req.user.role,
      req.user.id,
      {}//param,
    );
    return this.responseService.successResponse('Bookings list', bookings);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const booking = await this.bookingsService.findOne(
      id,
      req.user.id,
      req.user.role,
    );
    return this.responseService.successResponse('Booking details', booking);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Request() req,
  ) {
  
  }


  @Post(':id/reschedule')
  @UseGuards(RolesGuard)
  @Roles('customer')
  async reschedule(
    @Param('id') id: string,
    @Body() rescheduleDto: RescheduleDto,
    @Request() req,
  ) {
    // return this.bookingsService.assignStaff(
    //   id,
    //   assignStaffDto.staffId,
    //   req.user.id,
    // );
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Request() req) {
   
  }

  @Post(':id/review')
  @UseGuards(RolesGuard)
  @Roles('customer')
  async createReview(
    @Param('id') id: string,
    @Body() createReviewDto: CreateReviewDto,
    @Request() req,
  ) {
  }
}
