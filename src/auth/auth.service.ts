import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Register a new user
  async register(data: {
    name: string;
    email: string;
    phone?: string;
    role: string;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      const roleExist = await this.prisma.role.findUnique({
        where: { name: data.role },
      });
      if (!roleExist) {
        throw new NotFoundException('Role Not Found');
      }

      user = await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          status: UserStatus.disabled,
          roleId: roleExist.id,
        },
      });
    }

    const otp = await this.generateOtp(user.email);

    return {
      message: 'OTP sent',
      user,
      otp, // optionally return this only in dev or for testing, or send via SMS/email
    };
  }

  // Login an existing user
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.generateToken(user);

    return token;
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

  // Send OTP to user's email or phone (here we return it for testing)

  async generateOtp(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) throw new NotFoundException('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    const salt = await bcrypt.genSalt();
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Optional: delete any existing OTPs for the user
    await this.prisma.userOtp.deleteMany({
      where: { userId: user.id },
    });

    await this.prisma.userOtp.create({
      data: {
        userId: user.id,
        otpSecret: hashedOtp,
        expiresAt,
      },
    });

    // TODO: Send OTP via email/SMS here
    return { message: 'OTP sent successfully', otp }; // ⚠️ remove `otp` in production
  }

  // Verify user OTP
  async validateOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const latestOtp = await this.prisma.userOtp.findFirst({
      where: {
        userId: user.id,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' }, // Use most recent OTP
    });

    if (!latestOtp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const isValid = await bcrypt.compare(otp, latestOtp.otpSecret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'active',
      },
    });

    // Optional: delete OTP after successful use
    await this.prisma.userOtp.delete({ where: { id: latestOtp.id } });
    const token = await this.generateToken(user);
    return { message: 'OTP verified successfully', data: token };
  }

  // Validate JWT
  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }
}
