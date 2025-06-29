import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { ConsultationSessionsService } from './consultation-sessions.service';
import {
  ConnectConsultationDto,
  EndConsultationDto,
  StartConsultationDto,
} from './dto/create-consultation-session.dto';
import { ResponseService } from 'src/response/response.service';

@Controller('consultation-sessions')
export class ConsultationSessionsController {
  constructor(
    private readonly consultationSessionsService: ConsultationSessionsService,
    private readonly responseService: ResponseService,
  ) {}

  @Post('start')
  async start(@Body() dto: StartConsultationDto) {
    try {
      const session = await this.consultationSessionsService.startSession(
        dto.bookingId,
        dto.createdBy,
      );
      return this.responseService.successResponse(
        'Session created successfully',
        session,
      );
    } catch (error) {
      return this.responseService.errorResponse(error, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('connect')
  async connect(@Body() dto: ConnectConsultationDto) {
    try {
      const response = await this.consultationSessionsService.connectSession(
        dto.bookingId,
      );
      return this.responseService.successResponse(
        'Successfully connected',
        response,
      );
    } catch (error) {
      return this.responseService.errorResponse(error, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('end')
  async end(@Body() dto: EndConsultationDto) {
    try {
      const response = await this.consultationSessionsService.endSession(
        dto.bookingId,
        dto.endedBy,
        dto.notes,
      );
      return this.responseService.successResponse(
        'Successfully ended',
        response,
      );
    } catch (error) {
      return this.responseService.errorResponse(error, HttpStatus.BAD_REQUEST);
    }
  }
}
