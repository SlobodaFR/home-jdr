// nestjs-pino 5 keeps one process-wide pino-http middleware (first configuration wins):
// use this fixture at most once per spec file.
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

export type PinoHttpOptions = Record<string, unknown> & {
  serializers: Record<string, unknown>;
};

/** Boots Nest with the production logging wiring and returns everything that got logged. */
export async function logFailingRequest(
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
