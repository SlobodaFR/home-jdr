import type { Request } from 'express';

/**
 * Parameterized route of a request ('/api/sessions/:id'), never the raw URL: no ids, query string
 * or tokens. Null when the request matched no Nest route.
 */
export function routeOf(req: Request): string | null {
  const path = (req.route as { path?: unknown } | undefined)?.path;
  return typeof path === 'string' ? `${req.baseUrl}${path}` : null;
}
