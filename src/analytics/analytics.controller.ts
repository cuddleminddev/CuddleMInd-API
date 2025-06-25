import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ResponseService } from 'src/response/response.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly responseService: ResponseService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  async getAdminAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const data = await this.analyticsService.getAdminAnalytics(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      return this.responseService.successResponse('Admin analytics', data);
    } catch (error) {
      return this.responseService.errorResponse(
        error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('doctor/:doctorId')
  async getDoctorAnalytics(
    @Param('doctorId') doctorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const data = await this.analyticsService.getDoctorAnalytics(
        doctorId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      return this.responseService.successResponse('Doctor analytics', data);
    } catch (error) {
      return this.responseService.errorResponse(
        error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('charts/pie')
  async getPieChartData(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const data = await this.analyticsService.getPieChartDistributionChartJs(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      return this.responseService.successResponse('Pie chart data', data);
    } catch (error) {
      return this.responseService.errorResponse(
        error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('charts/line')
  async getLineChartData(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const data = await this.analyticsService.getBookingLineChartByType(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      return this.responseService.successResponse('Line chart data', data);
    } catch (error) {
      return this.responseService.errorResponse(
        error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
