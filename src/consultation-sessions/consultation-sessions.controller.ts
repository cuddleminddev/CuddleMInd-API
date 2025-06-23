import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ConsultationSessionsService } from './consultation-sessions.service';
import {
  ConnectConsultationDto,
  CreateConsultationSessionDto,
  EndConsultationDto,
  StartConsultationDto,
} from './dto/create-consultation-session.dto';
import { UpdateConsultationSessionDto } from './dto/update-consultation-session.dto';
import { ResponseService } from 'src/response/response.service';

@Controller('consultation-sessions')
export class ConsultationSessionsController {
  constructor(
    private readonly consultationSessionsService: ConsultationSessionsService,
    private readonly responseService: ResponseService,
  ) {}

  @Post('start')
  async start(@Body() dto: StartConsultationDto) {
    const session = await this.consultationSessionsService.startSession(
      dto.bookingId,
      dto.createdBy,
    );
    return this.responseService.successResponse(
      'session created Sucessfully',
      session,
    );
  }

  @Post('connect')
  async connect(@Body() dto: ConnectConsultationDto) {
    const response = await this.consultationSessionsService.connectSession(
      dto.bookingId,
    );
    return this.responseService.successResponse(
      'sucessfully connected',
      response,
    );
  }

  @Post('end')
  async end(@Body() dto: EndConsultationDto) {
    const resposne = await this.consultationSessionsService.endSession(
      dto.bookingId,
      dto.endedBy,
      dto.notes,
    );
    return this.responseService.successResponse('sucessfully ended', resposne);
  }
}
