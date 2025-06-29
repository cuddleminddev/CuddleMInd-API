import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendWelcomeEmail(to: string, name: string) {
    await this.mailerService.sendMail({
      to,
      subject: 'Welcome!',
      template: 'welcome', // e.g. templates/welcome.hbs
      context: { name },
    });
  }

  async sendOtpEmail(to: string, name: string, otp: string, expiry = 10) {
    try {
      const result = await this.mailerService.sendMail({
        to,
        subject: 'Your OTP Code',
        template: 'otp',
        context: {
          name,
          otp,
          expiry,
          appName: 'Cuddlemind',
        },
      });
      console.log('Email sent:', result);
      return { success: true, result };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendBookingConfirmationEmail(
    to: string,
    customerName: string,
    serviceName: string,
    address: string,
    specialInstructions?: string,
  ) {
    try {
      const result = await this.mailerService.sendMail({
        to,
        subject: 'Booking Confirmed – Cuddlemind',
        template: 'booking-confirmation', // views/booking-confirmation.hbs
        context: {
          customerName,
          serviceName,
          address,
          specialInstructions,
        },
      });
      console.log('Booking confirmation sent:', result);
      return { success: true, result };
    } catch (error) {
      console.error('Booking confirmation failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendForgotPasswordEmail(
    to: string,
    name: string,
    resetLink: string,
    expiry = 30,
  ) {
    try {
      const result = await this.mailerService.sendMail({
        to,
        subject: 'Reset Your Password – Clean By Maria',
        template: 'forgot-password',
        context: {
          name,
          resetLink,
          expiry,
        },
      });
      console.log('Forgot password email sent:', result);
      return { success: true };
    } catch (error) {
      console.error('Forgot password email failed:', error);
      return { success: false, error: error.message };
    }
  }
}
