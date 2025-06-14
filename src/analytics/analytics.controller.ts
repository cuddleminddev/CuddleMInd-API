import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ResponseService } from 'src/response/response.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('admin')
  async getAdminAnalytics() {
    const data = await this.analyticsService.getAdminAnalytics();
    return this.responseService.successResponse('admin anlytics', data);
  }

  @Get('doctor/:doctorId')
  async getDoctorAnalytics(@Param('doctorId') doctorId: string) {
    const data = await this.analyticsService.getDoctorAnalytics(doctorId);
    return this.responseService.successResponse('admin anlytics', data);
  }
}
