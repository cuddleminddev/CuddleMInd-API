import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ConsultationSessionsService } from './consultation-sessions.service';
import { CreateConsultationSessionDto } from './dto/create-consultation-session.dto';
import { UpdateConsultationSessionDto } from './dto/update-consultation-session.dto';

@Controller('consultation-sessions')
export class ConsultationSessionsController {
  constructor(private readonly consultationSessionsService: ConsultationSessionsService) {}

  @Post()
  create(@Body() createConsultationSessionDto: CreateConsultationSessionDto) {
    return this.consultationSessionsService.create(createConsultationSessionDto);
  }

  @Get()
  findAll() {
    return this.consultationSessionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consultationSessionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConsultationSessionDto: UpdateConsultationSessionDto) {
    return this.consultationSessionsService.update(+id, updateConsultationSessionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.consultationSessionsService.remove(+id);
  }
}
