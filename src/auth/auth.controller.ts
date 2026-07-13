import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailDto } from './dto/email.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { ResponseService } from 'src/response/response.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/mailer/mailer.service';
import { Public } from 'src/auth/decorators/public.decorator';
import * as bcrypt from 'bcryptjs';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Post('register')
  async register(@Body() data: RegisterDto) {
    const response = await this.authService.register(data);
    return this.responseService.successResponse(
      'Successfully registered',
      response,
    );
  }

  @Post('login')
  async login(@Body() data: LoginDto, @Res() res: Response) {
    try {
      const response = await this.authService.login(data.email, data.password);
      return res
        .status(HttpStatus.OK)
        .json(
          this.responseService.successResponse('Login successful', response),
        );
    } catch (error) {
      // login uses @Res() so we must handle the response manually
      const status =
        error instanceof UnauthorizedException
          ? HttpStatus.UNAUTHORIZED
          : HttpStatus.BAD_REQUEST;
      const message =
        error instanceof Error ? error.message : 'Login failed';
      return res.status(status).json({
        status: false,
        statusCode: status,
        message,
      });
    }
  }

  @Post('forgot-password')
  @Public()
  async forgotPassword(@Body('email') email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('No user found with that email');
    }

    if (user.status != 'active') {
      throw new BadRequestException('requested user is not active');
    }

    const result = await this.authService.generateOtp(email);
    await this.mailService.sendOtpEmail(email, user.name || 'User', result.otp, 5);

    return this.responseService.successResponse('OTP sent to your email');
  }

  @Post('reset-password')
  @Public()
  async resetPassword(
    @Body('email') email: string,
    @Body('otp') otp: string,
    @Body('newPassword') newPassword: string,
  ) {
    const user = await this.authService.verifyOtpOnly(email, otp);

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return this.responseService.successResponse('Password reset successful');
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: Request) {
    const user = await this.authService.validateUser((req.user as any).id);
    return this.responseService.successResponse('User profile', user);
  }

  @Post('otp/send')
  async sendOtp(@Body() data: EmailDto) {
    const result = await this.authService.generateOtp(data.email);
    await this.mailService.sendOtpEmail(data.email, result.user.name || 'User', result.otp, 10);
    return {
      message: result.message,
      otp: result.otp
    }
  }

  @Post('otp/verify')
  async verifyOtp(@Body() data: OtpVerifyDto) {
    const result = await this.authService.validateOtp(data.email, data.otp);
    return result;
  }
}
