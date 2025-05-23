import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProcessRefundDto } from './dto/process-refund.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('process')
  @UseGuards(RolesGuard)
  @Roles('customer')
  processPayment(@Body() createPaymentDto: CreatePaymentDto, @Request() req) {}

  @Post('refund')
  @UseGuards(RolesGuard)
  @Roles('admin')
  processRefund(@Body() processRefundDto: ProcessRefundDto, @Request() req) {
    // return this.paymentsService.processRefund(processRefundDto, req.user.id);
  }

  @Get()
  getTransactions(@Request() req) {
    // return this.paymentsService.getTransactions(req.user.id, req.user.role);
  }

  @Get('booking/:id')
  getBookingTransactions(@Param('id') id: string, @Request() req) {
    // return this.paymentsService.getBookingTransactions(
    //   id,
    //   req.user.id,
    //   req.user.role,
    // );
  }

  @Get(':id')
  getTransaction(@Param('id') id: string, @Request() req) {}

  @Get('user/transactions')
  @UseGuards(RolesGuard)
  @Roles('customer')
  getUserTransactions(@Request() req) {
    // return this.paymentsService.getUserTransactions(req.user.id);
  }

  @Post('methods')
  async createPaymentMethod(
    @Body() data: { paymentMethodId: string },
    @Request() req,
  ) {}

  @Get('methods')
  async getPaymentMethods(@Request() req) {}

  @Post('setup-intent')
  async createSetupIntent(@Request() req) {}
}
