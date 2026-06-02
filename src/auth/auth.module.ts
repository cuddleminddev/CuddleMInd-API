import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { ResponseModule } from 'src/response/response.module';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UsersModule,
    MailerModule,
    ResponseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const rawFromEnv = (configService.get<string>('JWT_EXPIRATION') ?? '').trim();
        const expiresInRaw = rawFromEnv.length > 0 ? rawFromEnv : '86400';
        const expiresIn = (/^\d+$/.test(expiresInRaw)
          ? Number(expiresInRaw)
          : expiresInRaw) as SignOptions['expiresIn'];

        return {
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn,
        },
        };
      },

    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule { }
