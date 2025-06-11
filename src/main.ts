import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('v1');

  // Stripe webhook needs raw body
  app.use(
    '/webhooks/stripe',
    json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // For all other routes
  app.use(json());
  app.use(urlencoded({ extended: true }));

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
}
bootstrap();
