import { SetMetadata } from '@nestjs/common';

export const SKIP_SAME_ORIGIN_KEY = 'skipSameOrigin';

/** Exempts a server-to-server route (no cookie, no browser) from `SameOriginGuard`. */
export const SkipSameOrigin = () => SetMetadata(SKIP_SAME_ORIGIN_KEY, true);
