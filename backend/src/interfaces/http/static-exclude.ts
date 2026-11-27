/**
 * Paths ServeStatic must never answer with the SPA index.html: API and health 404s stay JSON.
 * Express 5 (path-to-regexp 8) syntax; `/api*` is no longer valid.
 */
export const STATIC_EXCLUDE = [
  '/api',
  '/api/{*path}',
  '/healthz',
  '/healthz/{*path}',
  '/version',
  '/version/{*path}',
];
