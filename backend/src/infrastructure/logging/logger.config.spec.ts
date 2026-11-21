import { Writable } from 'stream';
import pino from 'pino';
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

  it('logs errors by type only: no message or stack', () => {
    const serialized = serializers().err(
      new TypeError('INSERT ... VALUES (alice@example.com)'),
    );

    expect(serialized).toEqual({ type: 'TypeError' });
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
