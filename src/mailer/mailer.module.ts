import { Module } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mailer.service';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule,
    NestMailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('SMTP_HOST') ?? config.get<string>('MAIL_HOST');
        const portRaw =
          config.get<string>('SMTP_PORT') ??
          config.get<string>('MAIL_PORT') ??
          '587';
        const secureRaw =
          config.get<string>('SMTP_SECURE') ??
          config.get<string>('MAIL_SECURE') ??
          'false';
        const user = config.get<string>('SMTP_USER') ?? config.get<string>('MAIL_USER');
        const pass = config.get<string>('SMTP_PASS') ?? config.get<string>('MAIL_PASS');

        const fromName = config.get<string>('MAIL_FROM_NAME');
        const fromEmail = config.get<string>('MAIL_FROM_EMAIL');
        const fromCombined = config.get<string>('MAIL_FROM');
        const from =
          fromName && fromEmail
            ? `"${fromName}" <${fromEmail}>`
            : fromCombined;

        return {
          transport: {
            host,
            port: Number(portRaw),
            secure: String(secureRaw).toLowerCase() === 'true',
            auth: {
              user,
              pass,
            },
          },
          defaults: {
            from,
          },
          template: {
            dir:
              process.env.NODE_ENV === 'production'
                ? path.join(__dirname, 'mailer', 'templates')
                : path.join(process.cwd(), 'src', 'mailer', 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailerModule { }
