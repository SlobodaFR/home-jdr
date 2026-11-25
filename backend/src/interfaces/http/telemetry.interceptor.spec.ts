import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  Controller,
  Delete,
  ExecutionContext,
  Get,
  Module,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { APP_INTERCEPTOR, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static';
import { lastValueFrom, of } from 'rxjs';
import request from 'supertest';
import { FakeTelemetry } from '../../application/shared/fake-telemetry';
import { Telemetry } from '../../domain/shared/telemetry';
import { TelemetryInterceptor } from './telemetry.interceptor';

@Controller('sessions')
class SessionsController {
  // Polled every 3.5 s by the session screen.
  @Get(':id/state')
  state(@Param('id') id: string): { id: string } {
    return { id };
  }

  @Get('boom')
  boom(): never {
    throw new TypeError('secret detail about alice@example.com');
  }

  @Get('missing')
  missing(): never {
    throw new NotFoundException('nope');
  }

  @Get(':id')
  find(@Param('id') id: string): { id: string } {
    return { id };
  }

  @Delete(':id')
  remove(): void {
    return;
  }
}

@Controller('healthz')
class HealthController {
  @Get()
  healthz(): string {
    return 'ok';
  }
}

describe('HTTP telemetry', () => {
  let app: NestExpressApplication;
  let telemetry: FakeTelemetry;
  let publicDir: string;

  beforeEach(async () => {
    publicDir = mkdtempSync(join(tmpdir(), 'jdr-public-'));
    writeFileSync(join(publicDir, 'index.html'), '<html></html>');
    mkdirSync(join(publicDir, 'assets'));
    writeFileSync(join(publicDir, 'assets', 'app.js'), 'void 0;');
    telemetry = new FakeTelemetry();
    // NestFactory (not Test.createTestingModule): ServeStaticModule needs the HTTP adapter at
    // module-init time, as in the real app.
    @Module({
      imports: [
        ServeStaticModule.forRoot({
          rootPath: publicDir,
          exclude: ['/api', '/api/{*path}', '/healthz', '/healthz/{*path}'],
        }),
      ],
      controllers: [SessionsController, HealthController],
      providers: [
        { provide: Telemetry, useValue: telemetry },
        { provide: APP_INTERCEPTOR, useClass: TelemetryInterceptor },
      ],
    })
    class TestAppModule {}
    app = await NestFactory.create<NestExpressApplication>(TestAppModule, {
      logger: false,
    });
    // Same prefix setup as main.ts.
    app.setGlobalPrefix('api', { exclude: ['healthz'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    rmSync(publicDir, { recursive: true, force: true });
  });

  it('reports each request with its route template, never the raw URL or query', async () => {
    await request(app.getHttpServer())
      .get('/api/sessions/42?token=secret')
      .expect(200);

    expect(telemetry.names()).toEqual(['http_request']);
    expect(telemetry.captured[0].event).toEqual({
      name: 'http_request',
      properties: {
        route: '/api/sessions/:id',
        method: 'GET',
        status: 200,
        duration_ms: expect.any(Number),
      },
    });
    expect(JSON.stringify(telemetry.captured)).not.toMatch(/42|secret/);
  });

  it('reports mutations with their method and status', async () => {
    await request(app.getHttpServer()).delete('/api/sessions/abc').expect(200);

    expect(telemetry.captured[0].event).toMatchObject({
      properties: { route: '/api/sessions/:id', method: 'DELETE', status: 200 },
    });
  });

  it('reports client errors with their status', async () => {
    await request(app.getHttpServer()).get('/api/sessions/missing').expect(404);

    expect(telemetry.captured[0].event).toMatchObject({
      properties: { route: '/api/sessions/missing', status: 404 },
    });
  });

  it('reports server errors with status 500 and never the error message', async () => {
    await request(app.getHttpServer()).get('/api/sessions/boom').expect(500);

    expect(telemetry.names()).toEqual(['http_request']);
    expect(telemetry.captured[0].event).toMatchObject({
      properties: { route: '/api/sessions/boom', status: 500 },
    });
    expect(JSON.stringify(telemetry.captured)).not.toContain('alice');
  });

  it('does not report /healthz (polled by Docker)', async () => {
    await request(app.getHttpServer()).get('/healthz').expect(200);

    expect(telemetry.captured).toEqual([]);
  });

  it('does not report the session state route (polled every 3.5 s by the session screen)', async () => {
    await request(app.getHttpServer())
      .get('/api/sessions/42/state')
      .expect(200);

    expect(telemetry.captured).toEqual([]);
  });

  it('reports nothing for a request that matches no route', async () => {
    // POST: the SPA fallback only answers GET, so this is a genuine Nest 404.
    await request(app.getHttpServer())
      .post('/api/nope/alice@example.com')
      .expect(404);

    expect(telemetry.names()).toEqual([]);
  });

  it('reports nothing for static assets and the SPA fallback (served outside Nest routes)', async () => {
    await request(app.getHttpServer()).get('/assets/app.js').expect(200);
    await request(app.getHttpServer()).get('/index.html').expect(200);
    await request(app.getHttpServer())
      .get('/sessions/alice@example.com')
      .expect(200);

    expect(telemetry.captured).toEqual([]);
  });

  it('ignores non-HTTP contexts: a WebSocket handler sharing the global interceptor emits nothing', async () => {
    const interceptor = new TelemetryInterceptor(telemetry);
    const next = { handle: () => of('pong') };
    const wsContext = {
      getType: () => 'ws',
      switchToHttp: () => {
        throw new Error('must not read an HTTP request on a ws context');
      },
    } as unknown as ExecutionContext;

    await lastValueFrom(interceptor.intercept(wsContext, next));

    expect(telemetry.captured).toEqual([]);
  });

  it('never reports an email carried by a query string or a path parameter', async () => {
    await request(app.getHttpServer())
      .get('/api/sessions/alice@example.com?email=bob@example.com')
      .expect(200);

    expect(telemetry.names()).toEqual(['http_request']);
    expect(JSON.stringify(telemetry.captured)).not.toMatch(/alice|bob|@/);
    expect(telemetry.captured[0].event).toMatchObject({
      properties: { route: '/api/sessions/:id' },
    });
  });
});
