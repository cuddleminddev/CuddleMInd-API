import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) { }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private async sendTemplateMail(params: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
  }) {
    return this.mailerService.sendMail({
      to: params.to,
      subject: params.subject,
      template: params.template,
      context: params.context,
    });
  }

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

      return {
        success: true,
        messageId: result.messageId,
      };

    } catch (error) {
      console.error('Email sending failed:', error);

      return {
        success: false,
        error: this.getErrorMessage(error),
      };
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
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async sendDoctorBookingStatusEmail(params: {
    to: string;
    doctorName: string;
    patientName: string;
    scheduledAt: Date;
    sessionType: string;
    durationMinutes: number;
    amount: number;
    status: 'pending' | 'confirmed' | 'cancelled';
  }) {
    try {
      const result = await this.sendTemplateMail({
        to: params.to,
        subject:
          params.status === 'pending'
            ? 'New booking assigned - Cuddlemind'
            : params.status === 'confirmed'
              ? 'Booking confirmed - Cuddlemind'
              : 'Booking cancelled - Cuddlemind',
        template: 'booking-status',
        context: {
          doctorName: params.doctorName,
          patientName: params.patientName,
          scheduledAt: params.scheduledAt.toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          sessionType: params.sessionType,
          durationMinutes: params.durationMinutes,
          amount: Number(params.amount).toFixed(2),
          status: params.status,
          statusLabel:
            params.status === 'pending'
              ? 'assigned'
              : params.status === 'confirmed'
                ? 'confirmed'
                : 'cancelled',
          isPending: params.status === 'pending',
          isConfirmed: params.status === 'confirmed',
        },
      });

      return { success: true, result };
    } catch (error) {
      console.error('Doctor booking email failed:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async sendBookingReminderEmail(params: {
    to: string;
    recipientName: string;
    otherPartyName: string;
    scheduledAt: Date;
    role: 'doctor' | 'patient';
    bookingId: string;
  }) {
    try {
      const result = await this.sendTemplateMail({
        to: params.to,
        subject: 'Upcoming session reminder - Cuddlemind',
        template: 'booking-reminder',
        context: {
          recipientName: params.recipientName,
          otherPartyName: params.otherPartyName,
          roleLabel: params.role === 'doctor' ? 'doctor' : 'patient',
          scheduledAt: params.scheduledAt.toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          bookingId: params.bookingId,
        },
      });

      return { success: true, result };
    } catch (error) {
      console.error('Booking reminder email failed:', error);
      return { success: false, error: this.getErrorMessage(error) };
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
      return { success: false, error: this.getErrorMessage(error) };
    }
  }
}
