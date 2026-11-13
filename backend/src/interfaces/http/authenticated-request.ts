import type { Request } from 'express';

export interface CurrentUserPayload {
  id: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  cookies: Record<string, string | undefined>;
  user?: CurrentUserPayload;
}
