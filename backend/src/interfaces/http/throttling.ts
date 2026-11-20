import { minutes, ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * HTTP rate limit, applied by the global ThrottlerGuard to every route.
 *
 * - Keyed on req.ip, resolved through `trust proxy` (see main.ts, TRUST_PROXY_HOPS).
 * - Budgets are per route and per IP. The default is generous on purpose: the
 *   session page polls every 3.5 s and a household often shares one IP.
 * - In-memory storage: counters reset on restart, fine for a single instance.
 */
export const THROTTLE_ERROR_MESSAGE =
  'Trop de requêtes, réessayez dans un instant.';

export const throttlerOptions: ThrottlerModuleOptions = {
  errorMessage: THROTTLE_ERROR_MESSAGE,
  ipv6SubnetPrefix: 64,
  throttlers: [{ ttl: minutes(1), limit: 300 }],
};

/** Tighter budget for routes that trigger an LLM or image-generation call (cost). */
export const LLM_THROTTLE = { default: { ttl: minutes(1), limit: 20 } };
