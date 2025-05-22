import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

 
  async register(registerDto: RegisterDto) {
    const { email } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }
    // Create user
    const user = await this.usersService.create({
      ...registerDto,
    });

    if (registerDto.password) {
      return this.generateToken(user);
    } else {
      return await this.generateOtp(email);
    }
  }

  async generateToken(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      },
    };
  }

  async generateOtp(email: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security reasons, don't reveal that the user doesn't exist
      return { message: 'Not A Registered User' };
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry time (15 minutes from now)
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 15);

    // Update user with OTP

    // In a real application, you would send the OTP via email
    // For development purposes, return it directly
    if (process.env.NODE_ENV !== 'production') {
      return {
        message:
          'OTP generated successfully. In production, this would be sent via email.',
        otp, // Only include this in development
      };
    }
    return { message: 'OTP sent to your email' };
  }


}
