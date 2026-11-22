/**
 * Nest creation options shared by main.ts and the HTTP tests. `rawBody` keeps the exact bytes of
 * the body (req.rawBody): the logout webhook from home-auth is signed over what was sent, not over
 * its re-serialization (contract PC7).
 */
export const nestApplicationOptions = { rawBody: true } as const;
