import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Telemetry } from '../../domain/shared/telemetry';
import { TelemetryInterceptor } from '../../interfaces/http/telemetry.interceptor';
import { RuntimeHealthMonitor } from '../observability/runtime-health.monitor';
import { createPostHogTelemetry } from './posthog-telemetry';

/** Operational telemetry (runtime_health, http_request): global, NOOP without POSTHOG_API_KEY. */
@Global()
@Module({
  providers: [
    {
      provide: Telemetry,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createPostHogTelemetry(config),
    },
    { provide: APP_INTERCEPTOR, useClass: TelemetryInterceptor },
    RuntimeHealthMonitor,
  ],
  exports: [Telemetry, RuntimeHealthMonitor],
})
export class TelemetryModule {}
