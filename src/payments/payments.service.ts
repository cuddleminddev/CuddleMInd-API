import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';


@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}




  
}
