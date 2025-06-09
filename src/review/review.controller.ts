import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';

import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: Request, @Body() dto: CreateReviewDto) {
    const user = req.user as any;
    return this.reviewService.create(user.id, dto);
  }

  @Get('doctor/:doctorId')
  async getDoctorReviews(@Param('doctorId') doctorId: string) {
    return this.reviewService.getDoctorReviews(doctorId);
  }
}
