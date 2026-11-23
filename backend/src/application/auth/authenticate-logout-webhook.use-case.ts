import { createHash, timingSafeEqual } from 'node:crypto';
import { Logger } from '@nestjs/common';
import {
  WebhookSignatureHeaders,
  WebhookSignatureVerifier,
} from '../../domain/auth/webhook-signature';
import { ClockPort } from '../../domain/shared/clock.port';
import { FeatureFlags } from '../../domain/shared/feature-flags';

/** home-features flag: signature mandatory, the legacy ?secret= is no longer accepted. Code default: false. */
export const REQUIRE_SIGNATURE_FLAG = 'auth-webhook-require-signature';

/** One log line per reason (and for signature acceptances) over this duration. */
export const LOG_THROTTLE_MS = 5 * 60_000;

/** Why an acceptance went through the legacy ?secret= rather than the signature. */
type LegacyReason =
  | 'no-signature-headers'
  | 'missing-signing-secret'
  | 'raw-body-unavailable'
  | 'format'
  | 'window'
  | 'hmac';

export interface LogoutWebhookRequest {
  headers: WebhookSignatureHeaders;
  /** Exact bytes received (req.rawBody); absent if the body was not read as JSON. */
  rawBody?: Buffer;
  /** Legacy shared secret, passed as `?secret=` (to be removed once signing is in place). */
  querySecret?: string;
}

/**
 * Authenticates the home-auth logout webhook call (contract PC7, double acceptance): valid v1
 * signature, OR the legacy `?secret=` while `auth-webhook-require-signature` is false.
 * - As soon as a signature header is present and the id was already accepted (replay), the request
 *   is refused, even with a valid `?secret=`.
 * - Other signature failures (format, window, hmac) or the impossibility to check it (no signing
 *   secret, raw body missing) fall back to the `?secret=` while the flag is false.
 * - Flag true: only the signature counts; without a signing secret nothing is accepted.
 * Each acceptance is logged (WARN for the `?secret=` with its reason, INFO for the signature), one
 * line per reason every 5 minutes, never writing the secret, the signature or the id.
 */
export class AuthenticateLogoutWebhookUseCase {
  private readonly lastLogged = new Map<string, number>();

  /** `verifier` null: no signing secret, only the legacy path exists. */
  constructor(
    private readonly verifier: WebhookSignatureVerifier | null,
    private readonly legacySecret: string,
    private readonly flags: FeatureFlags,
    private readonly clock: ClockPort,
    private readonly logger: Pick<Logger, 'log' | 'warn'> = new Logger(
      AuthenticateLogoutWebhookUseCase.name,
    ),
  ) {}

  async execute(request: LogoutWebhookRequest): Promise<boolean> {
    const { id, timestamp, signature } = request.headers;
    const hasSignatureHeaders = Boolean(id || timestamp || signature);

    // Replay first: refused whatever the raw body, format or window, and even with a valid ?secret=.
    if (hasSignatureHeaders && this.verifier?.isReplay(id)) return false;

    let reason: LegacyReason;
    if (!hasSignatureHeaders) reason = 'no-signature-headers';
    else if (!this.verifier) reason = 'missing-signing-secret';
    else if (!request.rawBody) reason = 'raw-body-unavailable';
    else {
      const result = this.verifier.verify(request.headers, request.rawBody);
      if (result === 'ok') {
        this.logThrottled('info:signature', () =>
          this.logger.log('Logout webhook accepted: signature'),
        );
        return true;
      }
      if (result === 'replay') return false;
      reason = result;
    }

    // Non-blocking evaluation (the adapter memoizes); never read when the signature suffices.
    if (await this.flags.isEnabled(REQUIRE_SIGNATURE_FLAG, false)) return false;
    if (!this.matchesLegacySecret(request.querySecret)) return false;
    this.logThrottled(`warn:${reason}`, () =>
      this.logger.warn(`Logout webhook accepted: legacy ?secret= (${reason})`),
    );
    return true;
  }

  private logThrottled(key: string, write: () => void): void {
    const nowMs = this.clock.now().getTime();
    const last = this.lastLogged.get(key);
    if (last !== undefined && nowMs - last < LOG_THROTTLE_MS) return;
    this.lastLogged.set(key, nowMs);
    write();
  }

  private matchesLegacySecret(candidate: string | undefined): boolean {
    if (!this.legacySecret || typeof candidate !== 'string') return false;
    // Digests of equal size: timingSafeEqual would otherwise require equal-length inputs.
    return timingSafeEqual(sha256(candidate), sha256(this.legacySecret));
  }
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}
