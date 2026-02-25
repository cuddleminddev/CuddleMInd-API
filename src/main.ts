import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global prefix
  app.setGlobalPrefix('v1');

  // 🔹 Serve static files from /uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  // Razorpay webhook: preserve raw body for signature verification.
  // Must come BEFORE the global json() middleware.
  app.use(
    '/v1/webhook/razorpay',
    json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
        console.log('[STARTUP/WEBHOOK-MW] rawBody captured, length:', buf?.length);
      },
    }),
  );

  // For all other routes (skip if already parsed by webhook middleware above)
  app.use((req: any, res, next) => {
    if (req.rawBody) return next(); // webhook route already parsed
    json()(req, res, next);
  });
  app.use(urlencoded({ extended: true }));

  // Global exception filter — sends correct HTTP status codes for all errors
  app.useGlobalFilters(new HttpExceptionFilter());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  // 🔹 Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('CuddleMind API')
    .setDescription('Mental Health Consultation API')
    .setVersion('1.0')
    .addBearerAuth() // Enables JWT auth in Swagger
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); // Swagger UI will be at /api/docs

  // Start the server
  await app.listen(process.env.PORT || 3000);
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
  const apiSecret = process.env.RAZORPAY_KEY_SECRET || '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  console.log(`🔑 RAZORPAY_KEY_SECRET     : ${apiSecret ? apiSecret.slice(0, 6) + '******' : '❌ NOT SET'}  (length=${apiSecret.length})`);
  console.log(`🔑 RAZORPAY_WEBHOOK_SECRET : ${webhookSecret ? webhookSecret.slice(0, 6) + '******' : '❌ NOT SET'}  (length=${webhookSecret.length})`);
  if (!webhookSecret) {
    console.error('⚠️  RAZORPAY_WEBHOOK_SECRET is not set! Webhook verification will fail.');
  }
}
bootstrap();
