import type { IncomingMessage, ServerResponse } from 'http';
import type { Params } from 'nestjs-pino';

/**
 * Defense in depth only: pino redaction matches object keys (one level per `*`) and never looks
 * inside message strings. The real control is that log messages never interpolate personal data
 * (use pseudonymize()) and that request/response serializers keep no headers, query or body.
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'res.headers.location',
  '*.email',
  '*.token',
  '*.client_secret',
  '*.code_verifier',
  '*.refresh_token',
];

const QUIET_PATHS = [/^\/assets\//, /^\/healthz\/?$/];

function pathOf(url: string | undefined): string {
  return (url ?? '').split('?')[0];
}

const API_KEY = /\bsk-[A-Za-z0-9_-]+/g;
const stripKeys = (text: unknown) =>
  typeof text === 'string' ? text.replace(API_KEY, 'sk-[redacted]') : undefined;

/**
 * Whitelist serializer: pino's default copies every enumerable property, and TypeORM's
 * QueryFailedError carries `query`, `parameters` and `driverError` (emails, names). Only the
 * type, message, stack and code are kept, with API keys stripped.
 */
export function serializeError(input: Error & { code?: unknown }) {
  // Some pino-http versions pass an already-serialized error with the original in `.raw`.
  const raw = (input as { raw?: unknown }).raw;
  const err = raw instanceof Error ? (raw as typeof input) : input;
  return {
    type: err.name,
    message: stripKeys(err.message),
    stack: stripKeys(err.stack),
    code: typeof err.code === 'string' ? err.code : undefined,
  };
}

export function loggerParams(nodeEnv: string | undefined): Params {
  return {
    pinoHttp: {
      level: nodeEnv === 'test' ? 'silent' : 'info',
      redact: REDACT_PATHS,
      // pino-http would otherwise run pino's std serializer first (copies props, concatenates
      // `cause` messages) and hand serializeError a plain object: it must receive the Error.
      wrapSerializers: false,
      serializers: {
        // No headers (cookies, tokens), no query string (OAuth code and state), no IP.
        req: (req: IncomingMessage) => ({
          method: req.method,
          url: pathOf(req.url),
        }),
        // No headers: Location carries authorization codes, Set-Cookie the session token.
        res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
        err: serializeError,
      },
      autoLogging: {
        ignore: (req: IncomingMessage) =>
          QUIET_PATHS.some((pattern) => pattern.test(pathOf(req.url))),
      },
      customLogLevel: (
        _req: IncomingMessage,
        res: ServerResponse,
        err?: Error,
      ) => {
        if (err || res.statusCode >= 500) {
          return 'error';
        }
        return res.statusCode >= 400 ? 'warn' : 'info';
      },
      transport:
        nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  };
}
