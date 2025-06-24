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
  setWeeklySchedule(@Body() dto: CreateWeeklyScheduleDto) {
    return this.timeSlotsService.setWeeklySchedule(dto);
  }

  @Get()
  findAll() {
    return this.timeSlotsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('weekly')
  async getDoctorWeeklySchedule(@Query('doctorId') doctorId: string) {
    if (!doctorId) throw new BadRequestException('doctorId is required');
    return this.timeSlotsService.getWeeklySchedule(doctorId);
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
  findOne(@Param('id') id: string) {
    return this.timeSlotsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTimeSlotDto: UpdateTimeSlotDto,
  ) {
    return this.timeSlotsService.update(+id, updateTimeSlotDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.timeSlotsService.remove(+id);
  }
}
