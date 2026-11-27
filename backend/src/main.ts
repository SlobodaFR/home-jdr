import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { buildInfo } from './infrastructure/observability/build-info';
import { nestApplicationOptions } from './nest-application-options';
import {
  applySecurityHeaders,
  imageOriginFrom,
} from './interfaces/http/security-headers';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    ...nestApplicationOptions,
  });
  app.useLogger(app.get(Logger));
  // SIGTERM (each deploy) flushes the telemetry queue (PostHogTelemetry.onApplicationShutdown).
  app.enableShutdownHooks();
  // First middleware: every response (API and SPA files) gets the security headers.
  applySecurityHeaders(app, {
    imageOrigins: imageOriginFrom(process.env.MINIO_ENDPOINT),
  });
  // Reverse-proxy hops to trust for X-Forwarded-For (req.ip feeds the rate limit).
  // Production: 1 (Caddy). Unset locally, otherwise any client could spoof its IP.
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }
  // /healthz stays at the root: internal only, blocked by Caddy (deploy/Caddyfile).
  // /version (release identity, public) too: same root, not blocked by Caddy.
  app.setGlobalPrefix('api', {
    exclude: ['healthz', 'healthz/{*path}', 'version', 'version/{*path}'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(cookieParser());
  // No CORS: the SPA is served by this same app (same origin) and the Vite dev
  // server proxies /api. Never fall back to "any origin" with credentials.

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  const { version, commit } = buildInfo();
  app.get(Logger).log(`home-jdr started version=${version} commit=${commit}`);
}

void bootstrap();
