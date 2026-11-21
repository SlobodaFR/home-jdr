import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import {
  applySecurityHeaders,
  imageOriginFrom,
} from './interfaces/http/security-headers';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // First middleware: every response (API and SPA files) gets the security headers.
  applySecurityHeaders(app, {
    imageOrigins: imageOriginFrom(process.env.MINIO_ENDPOINT),
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(cookieParser());
  // No CORS: the SPA is served by this same app (same origin) and the Vite dev
  // server proxies /api. Never fall back to "any origin" with credentials.

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

void bootstrap();
