import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';

@Controller('webhook')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('razorpay')
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() request: Request,
  ) {
    const rawBody = (request as any).rawBody;
    if (!signature || !rawBody) {
      throw new BadRequestException('Missing signature or raw body');
    }

    return this.stripeService.handleWebhook(signature, rawBody);
  }

  /**
   * MOCK TEST ENDPOINT — Remove before production.
   * Simulates a payment.confirmed event for a specific doctor.
   * Use this to verify the doctor WebSocket receives `instant_session_started`.
   *
   * POST /webhook/mock-doctor-notify
   * Body: { doctorId, patientId, bookingId, scheduledAt? }
   */
  @Post('mock-doctor-notify')
  async mockDoctorNotify(
    @Body()
    body: {
      doctorId: string;
      patientId: string;
      bookingId: string;
      scheduledAt?: string;
    },
  ) {
    const { doctorId, patientId, bookingId, scheduledAt } = body;

    if (!doctorId || !patientId || !bookingId) {
      throw new BadRequestException(
        'doctorId, patientId, and bookingId are required',
      );
    }

    const payload = {
      doctorId,
      patientId,
      bookingId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
    };

    console.log('[MOCK] Firing payment.confirmed event with payload:', payload);
    this.eventEmitter.emit('payment.confirmed', payload);

    return {
      success: true,
      message:
        'Mock payment.confirmed event fired. Doctor should receive instant_session_started via WebSocket.',
      payload,
    };
  }
}
