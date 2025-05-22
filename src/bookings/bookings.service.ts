import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import dayjs from 'dayjs';
import { RescheduleDto } from './dto/reschedule.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(createBookingDto: CreateBookingDto, userId: string) {}

  async findAll(role: string, userId: string, param: any) {}

  async findOne(id: string, userId?: string, role?: string) {}
}
