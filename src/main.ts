import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { json } from 'express';
import getRawBody from 'raw-body';
import { DataSource } from 'typeorm';
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create app WITHOUT global JSON parsing (we'll configure it manually)
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body buffer
  });

  const configService = app.get(ConfigService);

  // Run migrations on startup (production only)
  if (configService.get('RUN_MIGRATIONS') === 'true') {
    try {
      const dataSource = app.get(DataSource);
      logger.log('🔄 Running database migrations...');
      await dataSource.runMigrations();
      logger.log('✅ Migrations executed successfully');
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      // Don't exit in production - app might still work with existing schema
      // Only log the error
      if (configService.get('NODE_ENV') !== 'production') {
        process.exit(1);
      }
    }
  }

  // CRITICAL: Configure raw body middleware for webhook endpoint
  // This preserves the raw request body for signature verification
  app.use('/wallet/paystack/webhook', (req, res, next) => {
    if (req.method === 'POST') {
      getRawBody(
        req,
        {
          length: req.headers['content-length'],
          limit: '1mb',
          encoding: 'utf8',
        },
        (err, string) => {
          if (err) {
            logger.error('Error reading raw body', err);
            return next(err);
          }
          // Store raw body for signature verification
          req.rawBody = string;
          // Parse JSON manually and attach to req.body
          try {
            req.body = JSON.parse(string);
          } catch (parseError) {
            logger.error('Error parsing JSON body', parseError);
            return next(parseError);
          }
          next();
        },
      );
    } else {
      next();
    }
  });

  // Global JSON parsing for all OTHER routes (not webhook)
  app.use(
    json({
      verify: (req: any, res, buf, encoding) => {
        // Skip webhook route (already handled above)
        if (req.url !== '/wallet/paystack/webhook') {
          return;
        }
      },
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*', // Allow all for initial deployment/testing
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-paystack-signature',
    ],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Security headers
  app.use(helmet());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('HNG Stage 8 - Wallet Service')
    .setDescription(
      'Production-grade wallet service with Paystack integration, supporting JWT and API Key authentication',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
      'JWT',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'Enter your API key (e.g., sk_live_...)',
      },
      'API-Key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`\n🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs\n`);
}
bootstrap();
