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

@Controller('consultation-sessions')
export class ConsultationSessionsController {
  constructor(
    private readonly consultationSessionsService: ConsultationSessionsService,
  ) {}

  @Post('start')
  start(@Body() dto: StartConsultationDto) {
    return this.consultationSessionsService.startSession(
      dto.bookingId,
      dto.createdBy,
    );
  }

  @Post('connect')
  connect(@Body() dto: ConnectConsultationDto) {
    return this.consultationSessionsService.connectSession(dto.bookingId);
  }

  @Post('end')
  end(@Body() dto: EndConsultationDto) {
    return this.consultationSessionsService.endSession(
      dto.bookingId,
      dto.endedBy,
      dto.notes,
    );
  }
}
