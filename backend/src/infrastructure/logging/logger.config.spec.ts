import { Writable } from 'stream';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { loggerParams, REDACT_PATHS } from './logger.config';

type Serializer = (value: unknown) => unknown;

function serializers(): {
  req: Serializer;
  res: Serializer;
  err: Serializer;
} {
  const options = loggerParams('production').pinoHttp as {
    serializers: { req: Serializer; res: Serializer; err: Serializer };
  };
  return options.serializers;
}

function options(): Record<string, unknown> {
  return loggerParams('production').pinoHttp as Record<string, unknown>;
}

describe('logger configuration', () => {
  it('logs requests as method and path only: no query string, headers or IP', () => {
    const serialized = serializers().req({
      method: 'GET',
      url: '/api/auth/callback?code=abc&state=xyz',
      headers: { cookie: 'auth_session=x', authorization: 'Bearer y' },
      remoteAddress: '203.0.113.7',
    });

    expect(serialized).toEqual({ method: 'GET', url: '/api/auth/callback' });
  });

  it('logs responses as status code only: no Location or Set-Cookie header', () => {
    const serialized = serializers().res({
      statusCode: 302,
      headers: {
        location: 'https://app.example.com/cb?code=secret',
        'set-cookie': 'auth_session=jwt',
      },
    });

    expect(serialized).toEqual({ statusCode: 302 });
  });

  it('logs errors through a whitelist: type, message, stack and code only', () => {
    const error = Object.assign(new Error('SQLITE_BUSY: database is locked'), {
      name: 'QueryFailedError',
      code: 'SQLITE_BUSY',
      query: 'INSERT INTO users (email, name) VALUES (?, ?)',
      parameters: ['alice@example.com', 'Alice Martin'],
      driverError: { parameters: ['alice@example.com'] },
      response: { data: 'alice@example.com' },
      cause: new Error('alice@example.com'),
    });

    const lines: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    // Same pipeline as production: nestjs-pino builds its logger through pino-http.
    const { logger } = pinoHttp({
      ...(loggerParams('production').pinoHttp as Record<string, unknown>),
      stream,
    });
    logger.error({ err: error }, 'request errored');
    logger.error(
      {
        err: new Error('wrapper failed', {
          cause: new Error('cause leak alice@example.com'),
        }),
      },
      'wrapped',
    );

    const output = lines.join('');
    expect(output).not.toContain('alice@example.com');
    expect(output).not.toContain('Alice Martin');
    expect(output).not.toContain('INSERT INTO');
    const logged = (
      JSON.parse(output.split('\n')[0]) as {
        err: Record<string, unknown>;
      }
    ).err;
    expect(Object.keys(logged).sort()).toEqual([
      'code',
      'message',
      'stack',
      'type',
    ]);
    expect(logged.type).toBe('QueryFailedError');
    expect(logged.code).toBe('SQLITE_BUSY');
    expect(logged.message).toBe('SQLITE_BUSY: database is locked');
  });

  it('never throws on an error carrying a non-Error raw property', () => {
    const error = Object.assign(new Error('provider failed'), {
      raw: '{"email":"alice@example.com"}',
    });

    expect(serializers().err(error)).toMatchObject({
      type: 'Error',
      message: 'provider failed',
    });
    expect(JSON.stringify(serializers().err(error))).not.toContain('alice');
  });

  it('strips API keys from logged error messages and stacks', () => {
    const logged = serializers().err(
      new Error('Incorrect API key provided: sk-proj-AbC_123-xyz'),
    ) as { message: string; stack: string };

    expect(logged.message).not.toContain('sk-proj');
    expect(logged.stack).not.toContain('sk-proj');
  });

  it('redacts personal and secret fields in structured log objects', () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    const logger = pino({ redact: REDACT_PATHS }, stream);

    logger.info(
      {
        user: { email: 'a@b.c', token: 't0k3n' },
        err: { code: 'SQLITE_BUSY' },
      },
      'event',
    );

    const output = lines.join('');
    expect(output).not.toContain('a@b.c');
    expect(output).not.toContain('t0k3n');
    // Error codes stay readable for diagnostics.
    expect(output).toContain('SQLITE_BUSY');
  });

  it('logs client errors as warn and server errors as error', () => {
    const level = options().customLogLevel as (
      req: unknown,
      res: { statusCode: number },
      err?: Error,
    ) => string;

    expect(level({}, { statusCode: 200 })).toBe('info');
    expect(level({}, { statusCode: 404 })).toBe('warn');
    expect(level({}, { statusCode: 500 })).toBe('error');
    expect(level({}, { statusCode: 200 }, new Error('boom'))).toBe('error');
  });

  it('skips automatic request logs for static and noisy routes', () => {
    const ignore = (
      options().autoLogging as { ignore: (req: { url?: string }) => boolean }
    ).ignore;

    expect(ignore({ url: '/assets/index-abc.js' })).toBe(true);
    expect(ignore({ url: '/healthz' })).toBe(true);
    expect(ignore({ url: '/api/sessions' })).toBe(false);
  });

  it('pretty-prints only in development', () => {
    expect(
      (loggerParams('development').pinoHttp as Record<string, unknown>)
        .transport,
    ).toEqual({ target: 'pino-pretty' });
    expect(options().transport).toBeUndefined();
  });
});
