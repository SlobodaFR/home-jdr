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

@Controller('version')
class VersionController {
  @Get()
  version(): { version: string } {
    return { version: 'dev' };
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
      controllers: [HealthController, VersionController],
    })
    class TestAppModule {}
    app = await NestFactory.create<NestExpressApplication>(TestAppModule, {
      logger: false,
    });
    app.setGlobalPrefix('api', {
      exclude: ['healthz', 'healthz/{*path}', 'version', 'version/{*path}'],
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    rmSync(publicDir, { recursive: true, force: true });
  });

  it.each(['/api/nope', '/api', '/healthz/x', '/version/x'])(
    '%s answers 404 with JSON, not index.html',
    async (path) => {
      const res = await request(app.getHttpServer()).get(path).expect(404);

      expect(res.headers['content-type']).toContain('application/json');
      expect(res.text).not.toContain('spa');
    },
  );

  it('answers /version with JSON, not index.html', async () => {
    const res = await request(app.getHttpServer()).get('/version').expect(200);

    expect(res.body).toEqual({ version: 'dev' });
  });

  it('still serves the SPA for client-side routes', async () => {
    const res = await request(app.getHttpServer())
      .get('/sessions/abc')
      .expect(200);

    expect(res.text).toContain('spa');
  });
});
