import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { PinoLoggerService } from './infrastructure/logger/pino-logger.service';

function validateEnv(): void {
  const required = [
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'FRONTEND_URL',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

async function bootstrap() {
  validateEnv();

  const logger = new PinoLoggerService();
  const app = await NestFactory.create(AppModule, { logger });

  // 1. Configuração do Helmet para HTTP Headers de Segurança
  app.use(helmet());

  // 2. Configuração de CORS Restrito
  app.enableCors({
    origin: process.env.FRONTEND_URL!.split(',').map((o) => o.trim()),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. Validação global do Payload das rotas
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
