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
    try {
      const response = await this.authService.register(data);
      return this.responseService.successResponse(
        'Successfully registered',
        response,
      );
    } catch (error) {
      return this.responseService.errorResponse(error, HttpStatus.BAD_REQUEST);
    }
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
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(
          this.responseService.errorResponse(error, HttpStatus.UNAUTHORIZED),
        );
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10); // 10 min expiry

    // Save to UserOtp table
    await this.prisma.userOtp.create({
      data: {
        userId: user.id,
        otpSecret: otp,
        expiresAt: expiry,
      },
    });

    await this.mailService.sendOtpEmail(email, user.name || 'User', otp, 10);

    return this.responseService.successResponse('OTP sent to your email');
  }

  @Post('reset-password')
  @Public()
  async resetPassword(
    @Body('email') email: string,
    @Body('otp') otp: string,
    @Body('newPassword') newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const validOtp = await this.prisma.userOtp.findFirst({
      where: {
        userId: user.id,
        otpSecret: otp,
        expiresAt: { gte: new Date() }, // Not expired
      },
      orderBy: { createdAt: 'desc' }, // in case there are multiple
    });

    if (!validOtp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    // Optionally: delete OTPs after use
    await this.prisma.userOtp.deleteMany({
      where: { userId: user.id },
    });

    return this.responseService.successResponse('Password reset successful');
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: Request) {
    try {
      const user = await this.authService.validateUser((req.user as any).id);
      return this.responseService.successResponse('User profile', user);
    } catch (error) {
      return this.responseService.errorResponse(error, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('otp/send')
  async sendOtp(@Body() data: EmailDto) {
    try {
      const result = await this.authService.generateOtp(data.email);
      return this.responseService.successResponse(
        'OTP sent successfully',
        result,
      );
    } catch (error) {
      return this.responseService.errorResponse(error, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('otp/verify')
  async verifyOtp(@Body() data: OtpVerifyDto) {
    try {
      const result = await this.authService.validateOtp(data.email, data.otp);
      return this.responseService.successResponse(
        'OTP verified successfully',
        result,
      );
    } catch (error) {
      return this.responseService.errorResponse(error, HttpStatus.BAD_REQUEST);
    }
  }
}
