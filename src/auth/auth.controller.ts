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
import { Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailDto } from './dto/email.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { ResponseService } from 'src/response/response.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
  ) {}

  @Post('register')
  async register(@Body() data: RegisterDto) {
    const resposne = await this.authService.register(data);
    return this.responseService.successResponse(
      'Sucessfully registered',
      resposne,
    );
  }

  @Post('login')
  async login(@Body() data: LoginDto, @Res() res: Response) {
    try {
      const response = await this.authService.login(data.email, data.password);
      return res.status(HttpStatus.OK).json({
        status: true,
        message: 'Login successful',
        data: response,
      });
    } catch (err) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        status: false,
        message: err.message || 'Invalid Credentials',
      });
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: Request) {
    console.log('user', req.user);
    const user = await this.authService.validateUser((req.user as any).id);
    return user;
  }

  @Post('otp/send')
  async sendOtp(@Body() data: EmailDto) {
    return this.authService.generateOtp(data.email);
  }

  @Post('otp/verify')
  async verifyOtp(@Body() data: OtpVerifyDto) {
    return this.authService.validateOtp(data.email, data.otp);
  }
}
