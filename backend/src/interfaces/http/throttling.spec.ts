import { Controller, Get, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { LLM_THROTTLE, throttlerOptions } from './throttling';

@Controller()
class StubController {
  @Get('state')
  state(): string {
    return 'ok';
  }

  @Throttle(LLM_THROTTLE)
  @Post('llm')
  llm(): string {
    return 'ok';
  }
}

describe('Rate limiting (HTTP)', () => {
  async function createApp(
    trustProxyHops: number,
  ): Promise<NestExpressApplication> {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(throttlerOptions)],
      controllers: [StubController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>();
    if (trustProxyHops > 0) {
      app.set('trust proxy', trustProxyHops);
    }
    await app.init();
    return app;
  }

  it('lets the 3.5 s polling of a few household users through', async () => {
    const app = await createApp(0);
    for (let i = 0; i < 100; i++) {
      await request(app.getHttpServer()).get('/state').expect(200);
    }
    await app.close();
  }, 20_000);

  it('answers 429 on LLM routes after 20 calls a minute', async () => {
    const app = await createApp(0);
    for (let i = 0; i < 20; i++) {
      await request(app.getHttpServer()).post('/llm').expect(201);
    }
    await request(app.getHttpServer()).post('/llm').expect(429);
    await app.close();
  });

  it('keys the budget on the client IP behind one trusted proxy', async () => {
    const app = await createApp(1);
    for (let i = 0; i < 20; i++) {
      await request(app.getHttpServer())
        .post('/llm')
        .set('X-Forwarded-For', '203.0.113.1')
        .expect(201);
    }
    await request(app.getHttpServer())
      .post('/llm')
      .set('X-Forwarded-For', '203.0.113.1')
      .expect(429);
    // Another client IP has its own budget.
    await request(app.getHttpServer())
      .post('/llm')
      .set('X-Forwarded-For', '203.0.113.2')
      .expect(201);
    await app.close();
  });

  it('ignores X-Forwarded-For without a trusted proxy (no spoofing)', async () => {
    const app = await createApp(0);
    for (let i = 0; i < 20; i++) {
      await request(app.getHttpServer())
        .post('/llm')
        .set('X-Forwarded-For', `203.0.113.${i.toString()}`)
        .expect(201);
    }
    await request(app.getHttpServer())
      .post('/llm')
      .set('X-Forwarded-For', '203.0.113.99')
      .expect(429);
    await app.close();
  });
});
