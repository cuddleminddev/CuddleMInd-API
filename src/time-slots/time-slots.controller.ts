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
    const result = await this.timeSlotsService.setWeeklySchedule(dto);
    return this.responseService.successResponse(
      'Weekly schedule saved successfully',
      result,
    );
  }

  @Get()
  async findAll() {
    const result = await this.timeSlotsService.findAll();
    return this.responseService.successResponse(
      'Time slots retrieved successfully',
      result,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('weekly')
  async getDoctorWeeklySchedule(@Query('doctorId') doctorId: string) {
    if (!doctorId) {
      throw new BadRequestException('doctorId is required');
    }
    const result = await this.timeSlotsService.getWeeklySchedule(doctorId);
    return this.responseService.successResponse(
      'Doctor weekly schedule retrieved',
      result,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('available')
  async getAvailableTimeslots(@Query() query: GetAvailableTimeslotsDto) {
    const timeslots = await this.timeSlotsService.getAvailableTimeslots(
      query.date,
      query.doctorId,
    );
    return this.responseService.successResponse(
      'Available timeslots listed',
      timeslots,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.timeSlotsService.findOne(+id);
    return this.responseService.successResponse('Time slot retrieved', result);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTimeSlotDto: UpdateTimeSlotDto,
  ) {
    const result = await this.timeSlotsService.update(+id, updateTimeSlotDto);
    return this.responseService.successResponse('Time slot updated', result);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.timeSlotsService.remove(+id);
    return this.responseService.successResponse('Time slot deleted', result);
  }
}
