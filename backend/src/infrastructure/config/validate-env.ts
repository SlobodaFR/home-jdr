/** Needed by the code at startup or on the first login: no safe default exists. */
const REQUIRED = [
  'AUTH_SERVICE_URL',
  'AUTH_CLIENT_ID',
  'AUTH_CLIENT_SECRET',
  'AUTH_WEBHOOK_SECRET',
  'FRONTEND_URL',
  'MINIO_ENDPOINT',
  'MINIO_BUCKET',
  'MINIO_ACCESS_KEY_ID',
  'MINIO_SECRET_ACCESS_KEY',
] as const;

/** Public URLs (OAuth redirects): https only in production. */
const HTTPS_URLS = ['AUTH_SERVICE_URL', 'FRONTEND_URL'];

/**
 * Environment validation, run once at startup by ConfigModule. Throwing here stops the service
 * before it serves anything with a missing or unsafe configuration. Optional variables (LLM keys,
 * VAPID keys, quotas, Litestream) are deliberately not checked: their absence only disables a feature.
 */
export function validateEnv(
  env: Record<string, unknown>,
): Record<string, unknown> {
  if (env.NODE_ENV !== 'production') {
    return env;
  }
  for (const variable of REQUIRED) {
    const value = env[variable];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${variable} must be set in production`);
    }
  }
  for (const variable of HTTPS_URLS) {
    assertHttpsUrl(env[variable], variable);
  }
  return env;
}

function assertHttpsUrl(value: unknown, variable: string): void {
  let url: URL | null = null;
  try {
    url = typeof value === 'string' ? new URL(value) : null;
  } catch {
    url = null;
  }
  if (url?.protocol !== 'https:') {
    throw new Error(`${variable} must be set in production to an https:// URL`);
  }
}
