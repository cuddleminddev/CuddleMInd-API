import {
  Controller,
  Post,
  Headers,
  Req,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';

@Controller('webhook')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request,
  ) {
    const rawBody = (request as any).rawBody;
    if (!signature || !rawBody) {
      throw new BadRequestException('Missing signature or raw body');
    }

    return this.stripeService.handleWebhook(signature, rawBody);
  }
}
