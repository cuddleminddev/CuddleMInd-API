import { Injectable } from '@nestjs/common';
import { CreateConsultationSessionDto } from './dto/create-consultation-session.dto';
import { UpdateConsultationSessionDto } from './dto/update-consultation-session.dto';

@Injectable()
export class ConsultationSessionsService {
  create(createConsultationSessionDto: CreateConsultationSessionDto) {
    return 'This action adds a new consultationSession';
  }

  findAll() {
    return `This action returns all consultationSessions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} consultationSession`;
  }

  update(id: number, updateConsultationSessionDto: UpdateConsultationSessionDto) {
    return `This action updates a #${id} consultationSession`;
  }

  remove(id: number) {
    return `This action removes a #${id} consultationSession`;
  }
}
