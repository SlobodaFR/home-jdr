import { Controller, Get } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Logger, LoggerModule } from 'nestjs-pino';
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

describe('logging end to end (Nest + nestjs-pino + pino-http)', () => {
  it('logs a failed request without query parameters but with type and stack', async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    const params = loggerParams('production');
    const moduleRef = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          ...params,
          pinoHttp: [
            { ...(params.pinoHttp as Record<string, unknown>), level: 'info' },
            stream,
          ] as never,
        }),
      ],
      controllers: [FailingController],
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

    const output = lines.join('');
    expect(output).not.toContain('alice@example.com');
    expect(output).not.toContain('Alice Martin');
    expect(output).not.toContain('INSERT INTO');
    expect(output).not.toContain('oauth-code');
    expect(output).not.toContain('session=secret');
    const errors = lines
      .flatMap((line) => line.split('\n'))
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { err?: Record<string, unknown> })
      .flatMap((entry) => (entry.err ? [entry.err] : []));
    expect(errors.length).toBeGreaterThan(0);
    for (const err of errors) {
      expect(typeof err.type).toBe('string');
      expect(typeof err.stack).toBe('string');
      expect(
        Object.keys(err).every((key) =>
          ['type', 'message', 'stack', 'code'].includes(key),
        ),
      ).toBe(true);
    }
    expect(JSON.stringify(errors)).toContain('QueryFailedError');
  });
});
