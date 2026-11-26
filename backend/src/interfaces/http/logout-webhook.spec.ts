import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { nestApplicationOptions } from '../../nest-application-options';
import { RevokedSessionRepository } from '../../domain/auth/revoked-session.repository';
import { computeWebhookSignature } from '../../domain/auth/webhook-signature';
import { FeatureFlagsModule } from '../../infrastructure/feature-flags/feature-flags.module';
import { RevokedSessionOrmEntity } from '../../infrastructure/persistence/entities/revoked-session.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { SameOriginGuard } from './guards/same-origin.guard';
import { AuthModule } from './modules/auth.module';
import { serializedTypeOrmRoot } from '../../test-support/serialized-typeorm';

const SIGNING_SECRET =
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
const LEGACY_SECRET = 'legacy-query-secret';

describe('signed logout webhook (AuthModule behind the global SameOriginGuard, in-memory database)', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  async function boot(
    options: { signingSecret?: string; requireSignature?: boolean } = {},
  ): Promise<NestExpressApplication> {
    delete process.env.FEATURES_OFREP_URL;
    delete process.env.FEATURES_API_KEY;
    delete process.env.FEATURES_PIN_AUTH_WEBHOOK_REQUIRE_SIGNATURE;
    if (options.requireSignature)
      process.env.FEATURES_PIN_AUTH_WEBHOOK_REQUIRE_SIGNATURE = 'true';
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              AUTH_SERVICE_URL: 'https://auth.example.test',
              AUTH_CLIENT_ID: 'jdr',
              AUTH_CLIENT_SECRET: 'client-secret',
              AUTH_WEBHOOK_SECRET: LEGACY_SECRET,
              FRONTEND_URL: 'https://jdr.example.test',
              ...(options.signingSecret
                ? { AUTH_WEBHOOK_SIGNING_SECRET: options.signingSecret }
                : {}),
            }),
          ],
        }),
        serializedTypeOrmRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [UserOrmEntity, RevokedSessionOrmEntity],
          synchronize: true,
        }),
        FeatureFlagsModule,
        AuthModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: SameOriginGuard }],
    }).compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>(
      nestApplicationOptions,
    );
    // As main.ts: global prefix and validation pipe.
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    return app;
  }

  /** The call home-auth makes: exact JSON body, signature headers, no browser header. */
  function deliver(
    app: NestExpressApplication,
    rawBody: string,
    options: {
      id?: string;
      timestamp?: number;
      secret?: string;
      query?: string;
      sign?: boolean;
    } = {},
  ) {
    const id = options.id ?? randomUUID();
    const timestamp = String(
      options.timestamp ?? Math.floor(Date.now() / 1000),
    );
    const req = request(app.getHttpServer())
      .post(`/api/auth/disconnect${options.query ?? ''}`)
      .set('Content-Type', 'application/json');
    if (options.sign !== false)
      req
        .set('X-Auth-Webhook-Id', id)
        .set('X-Auth-Webhook-Timestamp', timestamp)
        .set(
          'X-Auth-Webhook-Signature',
          `v1=${computeWebhookSignature(options.secret ?? SIGNING_SECRET, id, timestamp, rawBody)}`,
        );
    return req.send(rawBody);
  }

  async function isRevoked(
    app: NestExpressApplication,
    userId: string,
  ): Promise<boolean> {
    return (
      (await app.get(RevokedSessionRepository).getRevokedAt(userId)) !== null
    );
  }

  it('accepts a signed request without ?secret= and revokes the user sessions', async () => {
    const app = await boot({ signingSecret: SIGNING_SECRET });
    try {
      await deliver(app, '{"userId":"alice"}').expect(204);
      expect(await isRevoked(app, 'alice')).toBe(true);
      expect(await isRevoked(app, 'bob')).toBe(false);
    } finally {
      await app.close();
    }
  });

  it('verifies the bytes received: a differently formatted body, signed as is, passes; tampered, it is refused', async () => {
    const app = await boot({ signingSecret: SIGNING_SECRET });
    try {
      await deliver(app, '{ "userId" : "alice" }').expect(204);

      const id = randomUUID();
      const timestamp = String(Math.floor(Date.now() / 1000));
      await request(app.getHttpServer())
        .post('/api/auth/disconnect')
        .set('Content-Type', 'application/json')
        .set('X-Auth-Webhook-Id', id)
        .set('X-Auth-Webhook-Timestamp', timestamp)
        .set(
          'X-Auth-Webhook-Signature',
          `v1=${computeWebhookSignature(SIGNING_SECRET, id, timestamp, '{"userId":"bob"}')}`,
        )
        .send('{"userId":"mallory"}')
        .expect(401);
      expect(await isRevoked(app, 'mallory')).toBe(false);
    } finally {
      await app.close();
    }
  });

  it('refuses another secret, a stale timestamp and a replay', async () => {
    const app = await boot({ signingSecret: SIGNING_SECRET });
    try {
      const body = '{"userId":"alice"}';
      await deliver(app, body, { secret: 'f'.repeat(64) }).expect(401);
      await deliver(app, body, {
        timestamp: Math.floor(Date.now() / 1000) - 3600,
      }).expect(401);
      const id = randomUUID();
      await deliver(app, body, { id }).expect(204);
      await deliver(app, body, { id }).expect(401);
    } finally {
      await app.close();
    }
  });

  it('refuses a replayed id even with a valid ?secret=, but accepts the legacy secret without headers', async () => {
    const app = await boot({ signingSecret: SIGNING_SECRET });
    try {
      const body = '{"userId":"alice"}';
      const id = randomUUID();
      await deliver(app, body, { id }).expect(204);
      await deliver(app, body, {
        id,
        query: `?secret=${LEGACY_SECRET}`,
      }).expect(401);
      await deliver(app, body, {
        sign: false,
        query: `?secret=${LEGACY_SECRET}`,
      }).expect(204);
    } finally {
      await app.close();
    }
  });

  it('falls back to a valid ?secret= when the signature is wrong (not a replay)', async () => {
    const app = await boot({ signingSecret: SIGNING_SECRET });
    try {
      await deliver(app, '{"userId":"alice"}', {
        secret: 'f'.repeat(64),
        query: `?secret=${LEGACY_SECRET}`,
      }).expect(204);
    } finally {
      await app.close();
    }
  });

  it('still accepts the legacy ?secret= while the signature is not mandatory', async () => {
    const app = await boot({ signingSecret: SIGNING_SECRET });
    try {
      const body = '{"userId":"alice"}';
      await deliver(app, body, {
        sign: false,
        query: `?secret=${LEGACY_SECRET}`,
      }).expect(204);
      await deliver(app, body, { sign: false, query: '?secret=wrong' }).expect(
        401,
      );
      await deliver(app, body, { sign: false }).expect(401);
    } finally {
      await app.close();
    }
  });

  it('without AUTH_WEBHOOK_SIGNING_SECRET, only the legacy path exists', async () => {
    const app = await boot();
    try {
      const body = '{"userId":"alice"}';
      await deliver(app, body).expect(401);
      await deliver(app, body, { query: `?secret=${LEGACY_SECRET}` }).expect(
        204,
      );
    } finally {
      await app.close();
    }
  });

  it('flag auth-webhook-require-signature on (pin): signature mandatory, ?secret= refused', async () => {
    const app = await boot({
      signingSecret: SIGNING_SECRET,
      requireSignature: true,
    });
    try {
      const body = '{"userId":"alice"}';
      await deliver(app, body).expect(204);
      await deliver(app, body, {
        sign: false,
        query: `?secret=${LEGACY_SECRET}`,
      }).expect(401);
      await deliver(app, body, {
        secret: 'f'.repeat(64),
        query: `?secret=${LEGACY_SECRET}`,
      }).expect(401);
    } finally {
      await app.close();
    }
  });

  it('refuses a body that is not {userId}, even correctly signed', async () => {
    const app = await boot({ signingSecret: SIGNING_SECRET });
    try {
      await deliver(app, '{}').expect(400);
    } finally {
      await app.close();
    }
  });
});
