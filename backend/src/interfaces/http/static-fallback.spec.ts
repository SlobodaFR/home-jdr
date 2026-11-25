import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static';
import request from 'supertest';
import { STATIC_EXCLUDE } from './static-exclude';

@Controller('healthz')
class HealthController {
  @Get()
  healthz(): string {
    return 'ok';
  }
}

// Guards against a path-to-regexp / serve-static bump silently turning API 404s into index.html.
describe('SPA fallback exclusions (real ServeStatic setup)', () => {
  let app: NestExpressApplication;
  let publicDir: string;

  beforeAll(async () => {
    publicDir = mkdtempSync(join(tmpdir(), 'jdr-spa-'));
    writeFileSync(join(publicDir, 'index.html'), '<html>spa</html>');
    @Module({
      imports: [
        ServeStaticModule.forRoot({
          rootPath: publicDir,
          exclude: STATIC_EXCLUDE,
        }),
      ],
      controllers: [HealthController],
    })
    class TestAppModule {}
    app = await NestFactory.create<NestExpressApplication>(TestAppModule, {
      logger: false,
    });
    app.setGlobalPrefix('api', { exclude: ['healthz'] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    rmSync(publicDir, { recursive: true, force: true });
  });

  it.each(['/api/nope', '/api'])(
    '%s answers 404 with JSON, not index.html',
    async (path) => {
      const res = await request(app.getHttpServer()).get(path).expect(404);

      expect(res.headers['content-type']).toContain('application/json');
      expect(res.text).not.toContain('spa');
    },
  );

  // Nest 12 scopes its JSON 404 handler to the global prefix (and the exact excluded routes), so
  // an unknown sub-path of /healthz gets Express's own 404. It must still never be the SPA.
  it('/healthz/x answers 404, not index.html', async () => {
    const res = await request(app.getHttpServer())
      .get('/healthz/x')
      .expect(404);

    expect(res.text).not.toContain('spa');
  });

  it('still serves the SPA for client-side routes', async () => {
    const res = await request(app.getHttpServer())
      .get('/sessions/abc')
      .expect(200);

    expect(res.text).toContain('spa');
  });
});
