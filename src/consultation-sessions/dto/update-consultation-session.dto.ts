import { PartialType } from '@nestjs/swagger';
import { CreateConsultationSessionDto } from './create-consultation-session.dto';

export class UpdateConsultationSessionDto extends PartialType(CreateConsultationSessionDto) {}
