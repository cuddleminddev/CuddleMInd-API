import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async create(createBookingDto: CreateBookingDto) {
    // const booking = await this.prisma.booking.create({
    //   data: {
    //     ...createBookingDto,
    //     status: 'pending',
    //   },
    // });
    // const paymentIntent = await this.paymentsService.createPaymentIntent({
    //   amount: booking.,
    //   currency: 'usd',
    //   metadata: { bookingId: booking.id },
    // });
    // return { booking, paymentIntent };
  }

  async findAll() {
    return this.prisma.booking.findMany();
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    // return this.prisma.booking.update({
    //   where: { id },
    //   data: updateBookingDto,
    // });
  }

  async remove(id: string) {
    return this.prisma.booking.delete({ where: { id } });
  }
}
