import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailDto } from './dto/email.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { ResponseService } from 'src/response/response.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
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
