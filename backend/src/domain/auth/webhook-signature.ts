import { createHmac, timingSafeEqual } from 'node:crypto';
import { ClockPort } from '../shared/clock.port';

/** Largest tolerated gap between the signed timestamp and the local clock (contract PC7). */
export const WEBHOOK_TOLERANCE_SECONDS = 120;
/** How long an accepted webhook id is refused if it comes back (contract PC7). */
export const WEBHOOK_REPLAY_TTL_MS = 10 * 60_000;

const TIMESTAMP_FORMAT = /^[0-9]{1,15}$/;
const SIGNATURE_ENTRY_FORMAT = /^v1=[0-9a-fA-F]{64}$/;

/** Outcome of a verification: `ok`, or the reason for the refusal (never logged with values). */
export type WebhookSignatureResult =
  | 'ok'
  | 'replay'
  | 'format'
  | 'window'
  | 'hmac';

export interface WebhookSignatureHeaders {
  /** X-Auth-Webhook-Id */
  id?: string;
  /** X-Auth-Webhook-Timestamp (secondes unix) */
  timestamp?: string;
  /** X-Auth-Webhook-Signature : `v1=<hex>[,v1=<hex>]` */
  signature?: string;
}

/**
 * Logout webhook signature (contract PC7, same as home-auth).
 * hex = HMAC-SHA256(secret, `${id}.${timestamp}.${rawBody}`); the key is the secret string as
 * stored (64 hex characters, UTF-8) and rawBody the bytes received.
 */
export function computeWebhookSignature(
  secret: string,
  id: string,
  timestamp: string,
  rawBody: string | Buffer,
): string {
  return createHmac('sha256', secret)
    .update(`${id}.${timestamp}.`)
    .update(rawBody)
    .digest('hex');
}

/**
 * Verifies the v1 signature of a logout webhook: well-formed headers, timestamp within the
 * window, at least one `v1=` entry equal (timingSafeEqual on 32 bytes) to the recomputed HMAC,
 * id not accepted in the last 10 minutes. The id is remembered only after a valid signature: a
 * forged request cannot "burn" the id of a genuine one. Seen ids live in process memory (a
 * restart forgets them).
 */
export class WebhookSignatureVerifier {
  /** Id → end of retention. Insertion order = expiry order (constant TTL). */
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly secret: string,
    private readonly clock: ClockPort,
  ) {}

  verify(
    headers: WebhookSignatureHeaders,
    rawBody: string | Buffer,
  ): WebhookSignatureResult {
    const { id, timestamp, signature } = headers;

    // An id already accepted is a replay whatever follows (even if the other headers are missing
    // or malformed): the caller must not fall back to the legacy ?secret= in that case.
    const nowMs = this.clock.now().getTime();
    this.forgetExpired(nowMs);
    if (id && this.seen.has(id)) return 'replay';

    if (!id || !timestamp || !signature) return 'format';
    if (!TIMESTAMP_FORMAT.test(timestamp)) return 'format';
    const received = this.parseSignatures(signature);
    if (!received) return 'format';

    if (
      Math.abs(Math.floor(nowMs / 1000) - Number(timestamp)) >
      WEBHOOK_TOLERANCE_SECONDS
    )
      return 'window';

    const expected = Buffer.from(
      computeWebhookSignature(this.secret, id, timestamp, rawBody),
      'hex',
    );
    // No short circuit: every entry is compared, wherever the right one sits.
    let matched = false;
    for (const candidate of received)
      if (timingSafeEqual(candidate, expected)) matched = true;
    if (!matched) return 'hmac';

    this.seen.set(id, nowMs + WEBHOOK_REPLAY_TTL_MS);
    return 'ok';
  }

  /** `v1=<hex>` entries decoded to 32 bytes; null if a single entry is malformed. */
  private parseSignatures(header: string): Buffer[] | null {
    const entries = header.split(',').map((entry) => entry.trim());
    if (!entries.every((entry) => SIGNATURE_ENTRY_FORMAT.test(entry)))
      return null;
    return entries.map((entry) => Buffer.from(entry.slice(3), 'hex'));
  }

  private forgetExpired(nowMs: number): void {
    for (const [id, expiresAt] of this.seen) {
      if (expiresAt > nowMs) break;
      this.seen.delete(id);
    }
  }
}
