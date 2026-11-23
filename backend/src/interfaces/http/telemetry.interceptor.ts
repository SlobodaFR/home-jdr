import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { Telemetry } from '../../domain/shared/telemetry';
import { routeOf } from './route-of';

/** Probed or polled: high volume, no debugging value. */
const UNREPORTED_ROUTES = new Set([
  // Docker healthcheck, every 30 s.
  '/healthz',
  // The session screen polls the session state every 3.5 s while open (SessionPage POLL_INTERVAL_MS).
  '/api/sessions/:id/state',
]);

/** Reports every request handled by a Nest route (http_request). */
@Injectable()
export class TelemetryInterceptor implements NestInterceptor {
  constructor(private readonly telemetry: Telemetry) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // A global interceptor also runs on WebSocket handlers: no route, no method, one event per message.
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const route = routeOf(req);
    if (route === null || UNREPORTED_ROUTES.has(route)) {
      return next.handle();
    }
    const startedAt = performance.now();
    const report = (status: number) => {
      this.telemetry.capture({
        name: 'http_request',
        properties: {
          route,
          method: req.method,
          status,
          duration_ms: Math.round(performance.now() - startedAt),
        },
      });
    };

    return next.handle().pipe(
      tap({
        next: () => {
          report(res.statusCode);
        },
        // The exception filter writes the response later: derive the status from the error.
        error: (error: unknown) => {
          report(error instanceof HttpException ? error.getStatus() : 500);
        },
      }),
    );
  }
}
