import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

export interface SecurityHeadersOptions {
  /** Extra origins allowed in `img-src` (MinIO serves the world-map images). */
  imageOrigins?: string[];
}

/** Origin of an endpoint URL, as a list (empty when missing or invalid). */
export function imageOriginFrom(endpoint: string | undefined): string[] {
  if (!endpoint) {
    return [];
  }
  try {
    const url = new URL(endpoint);
    // `new URL('minio:9000').origin` is the string 'null': only http(s) counts.
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? [url.origin]
      : [];
  } catch {
    return [];
  }
}

/**
 * Security headers for every response (API and SPA static files).
 * The SPA only needs same-origin scripts/XHR, Google Fonts, and cross-origin
 * images from MinIO. LLM and web-push calls are server-side, and push
 * subscription is done by the browser: neither is subject to this CSP.
 */
export function applySecurityHeaders(
  app: NestExpressApplication,
  options: SecurityHeadersOptions = {},
): void {
  app.use(
    helmet({
      strictTransportSecurity: { maxAge: 31_536_000, includeSubDomains: true }, // no preload: hard to undo
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', ...(options.imageOrigins ?? [])],
          connectSrc: ["'self'"],
          manifestSrc: ["'self'"],
          workerSrc: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
    }),
  );
}
