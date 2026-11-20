import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SKIP_SAME_ORIGIN_KEY } from '../decorators/skip-same-origin.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Bodies an HTML form can send cross-site without a CORS preflight.
const FORM_CONTENT_TYPES = ['application/x-www-form-urlencoded', 'text/plain'];

interface HttpRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * CSRF protection for the SPA's cookie-authenticated mutations. SameSite=Lax does not stop
 * requests from other *.sloboda.fr subdomains (same-site), so a mutation must come from this
 * very origin: Sec-Fetch-Site: same-origin, or, for browsers without it, a trusted Origin.
 * Applied globally; server-to-server routes (auth webhook) opt out with `@SkipSameOrigin()`.
 */
@Injectable()
export class SameOriginGuard implements CanActivate {
  private readonly trustedOrigins: Set<string>;

  constructor(
    config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    const urls = [config.get<string>('FRONTEND_URL')];
    this.trustedOrigins = new Set(
      urls
        .filter((url): url is string => Boolean(url))
        .map((url) => new URL(url).origin),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }
    const skipped = this.reflector.getAllAndOverride<boolean | undefined>(
      SKIP_SAME_ORIGIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipped) {
      return true;
    }
    const header = (name: string) => {
      const value = request.headers[name];
      return Array.isArray(value) ? value[0] : value;
    };

    const fetchSite = header('sec-fetch-site');
    const origin = header('origin');
    const sameOrigin = fetchSite
      ? fetchSite === 'same-origin'
      : origin !== undefined && this.trustedOrigins.has(origin);
    if (!sameOrigin) {
      throw new ForbiddenException('Cross-origin request refused');
    }

    const contentType = header('content-type')?.toLowerCase() ?? '';
    if (FORM_CONTENT_TYPES.some((type) => contentType.startsWith(type))) {
      throw new UnsupportedMediaTypeException('Send JSON');
    }
    return true;
  }
}
