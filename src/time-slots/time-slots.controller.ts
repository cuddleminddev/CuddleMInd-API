import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { TimeSlotsService } from './time-slots.service';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { GetAvailableTimeslotsDto } from './dto/get-available-time-slots.dto';
import { CreateWeeklyScheduleDto } from './dto/create-time-slot.dto';
import { ResponseService } from 'src/response/response.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('timeslots')
export class TimeSlotsController {
  constructor(
    private readonly timeSlotsService: TimeSlotsService,
    private readonly responseService: ResponseService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('schedule')
  async setWeeklySchedule(@Body() dto: CreateWeeklyScheduleDto) {
    try {
      const result = await this.timeSlotsService.setWeeklySchedule(dto);
      return this.responseService.successResponse(
        'Weekly schedule saved successfully',
        result,
      );
    } catch (error) {
      return this.responseService.errorResponse(
        error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async findAll() {
    try {
      const result = await this.timeSlotsService.findAll();
      return this.responseService.successResponse(
        'Time slots retrieved successfully',
        result,
      );
    } catch (error) {
      return this.responseService.errorResponse(
        error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('weekly')
  async getDoctorWeeklySchedule(@Query('doctorId') doctorId: string) {
    if (!doctorId) {
      return this.responseService.errorResponse(
        'doctorId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.timeSlotsService.getWeeklySchedule(doctorId);
      return this.responseService.successResponse(
        'Doctor weekly schedule retrieved',
        result,
      );
    } catch (error) {
      return this.responseService.errorResponse(
        error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('available')
  async getAvailableTimeslots(@Query() query: GetAvailableTimeslotsDto) {
    try {
      const timeslots = await this.timeSlotsService.getAvailableTimeslots(
        query.date,
        query.doctorId,
      );
      return this.responseService.successResponse(
        'Available timeslots listed',
        timeslots,
      );
    } catch (error) {
      return this.responseService.errorResponse(
        error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.timeSlotsService.findOne(+id);
      return this.responseService.successResponse(
        'Time slot retrieved',
        result,
      );
    } catch (error) {
      return this.responseService.errorResponse(
        error.message,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTimeSlotDto: UpdateTimeSlotDto,
  ) {
    try {
      const result = await this.timeSlotsService.update(+id, updateTimeSlotDto);
      return this.responseService.successResponse('Time slot updated', result);
    } catch (error) {
      return this.responseService.errorResponse(
        error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.timeSlotsService.remove(+id);
      return this.responseService.successResponse('Time slot deleted', result);
    } catch (error) {
      return this.responseService.errorResponse(
        error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
