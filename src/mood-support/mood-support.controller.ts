import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { MoodSupportService, MoodType } from './mood-support.service';
import { ResponseService } from 'src/response/response.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('mood-support')
@Controller('mood-support')
export class MoodSupportController {
  constructor(
    private readonly moodSupportService: MoodSupportService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('message')
  @ApiOperation({ summary: 'Get a consoling message based on mood' })
  @ApiQuery({
    name: 'mood',
    enum: ['happy', 'calm', 'sad', 'anxious', 'stressed'],
    description: "The user's current mood",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Mood-based consoling message retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid mood parameter',
  })
  async getConsolingMessage(@Query('mood') mood: string) {
    const validMoods: MoodType[] = [
      'happy',
      'calm',
      'sad',
      'anxious',
      'stressed',
    ];

    if (!mood || !validMoods.includes(mood as MoodType)) {
      throw new BadRequestException(
        `Invalid mood. Please provide one of: ${validMoods.join(', ')}`,
      );
    }

    const message = await this.moodSupportService.getConsolingMessage(
      mood as MoodType,
    );
    return this.responseService.successResponse(
      'Consoling message retrieved successfully',
      message,
    );
  }

  @Get('moods')
  @ApiOperation({ summary: 'Get all available mood types' })
  @ApiResponse({
    status: 200,
    description: 'Available mood types retrieved successfully',
  })
  async getAvailableMoods() {
    const moods = await this.moodSupportService.getAvailableMoods();
    return this.responseService.successResponse(
      'Available moods retrieved successfully',
      moods,
    );
  }
}
