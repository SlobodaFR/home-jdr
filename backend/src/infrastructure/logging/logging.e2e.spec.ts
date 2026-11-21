import { Controller, Get } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Logger, LoggerErrorInterceptor, LoggerModule } from 'nestjs-pino';
import { QueryFailedError } from 'typeorm';
import { Writable } from 'stream';
import request from 'supertest';
import { loggerParams } from './logger.config';

@Controller()
class FailingController {
  @Get('boom')
  boom(): never {
    throw new QueryFailedError(
      'INSERT INTO users (email, name) VALUES (?, ?)',
      ['alice@example.com', 'Alice Martin'],
      Object.assign(new Error('UNIQUE constraint failed: users.email'), {
        code: 'SQLITE_CONSTRAINT_UNIQUE',
      }),
    );
  }
}

type PinoHttpOptions = Record<string, unknown> & {
  serializers: Record<string, unknown>;
};

/** Boots Nest with the production logging wiring and returns everything that got logged. */
async function logFailingRequest(
  tweak: (options: PinoHttpOptions) => void = () => {},
): Promise<string[]> {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const params = loggerParams('production');
  const options = {
    ...(params.pinoHttp as PinoHttpOptions),
    level: 'info',
    serializers: { ...(params.pinoHttp as PinoHttpOptions).serializers },
  };
  tweak(options);
  const moduleRef = await Test.createTestingModule({
    imports: [
      LoggerModule.forRoot({ ...params, pinoHttp: [options, stream] as never }),
    ],
    controllers: [FailingController],
    providers: [{ provide: APP_INTERCEPTOR, useClass: LoggerErrorInterceptor }],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  await app.init();
  await request(app.getHttpServer())
    .get('/boom?code=oauth-code')
    .set('Cookie', 'session=secret')
    .expect(500);
  await app.close();
  return lines;
}

const errEntries = (lines: string[]) =>
  lines
    .flatMap((line) => line.split('\n'))
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { err?: Record<string, unknown> })
    .flatMap((entry) => (entry.err ? [entry.err] : []));

describe('logging end to end (Nest + nestjs-pino + pino-http)', () => {
  it('logs the real exception through the whitelist: type and stack, no query parameters', async () => {
    const lines = await logFailingRequest();

    const output = lines.join('');
    expect(output).not.toContain('alice@example.com');
    expect(output).not.toContain('Alice Martin');
    expect(output).not.toContain('INSERT INTO');
    expect(output).not.toContain('oauth-code');
    expect(output).not.toContain('session=secret');
    const errors = errEntries(lines);
    expect(errors.some((err) => err.type === 'QueryFailedError')).toBe(true);
    for (const err of errors) {
      expect(typeof err.stack).toBe('string');
      expect(
        Object.keys(err).every((key) =>
          ['type', 'message', 'stack', 'code'].includes(key),
        ),
      ).toBe(true);
    }
  });

  // Negative control: the same scenario without the whitelist must leak, otherwise the test above proves nothing.
  it('would leak the query parameters with pino default error serializer', async () => {
    const lines = await logFailingRequest((options) => {
      delete options.serializers.err;
    });

    expect(lines.join('')).toContain('alice@example.com');
  });
});
