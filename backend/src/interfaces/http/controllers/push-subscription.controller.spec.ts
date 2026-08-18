import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { PushNotificationPort } from '../../../domain/push-subscription/push-notification.port';
import { PushSubscriptionOrmEntity } from '../../../infrastructure/persistence/entities/push-subscription.orm-entity';
import { PushSubscriptionModule } from '../modules/push-subscription.module';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

// WebPushAdapter wraps the third-party `web-push` library and needs real
// VAPID keys to do anything - swapped for a no-op fake here so this suite
// stays focused on what it owns: DTO validation, ownership checks and the
// HTTP <-> use-case <-> repository plumbing (see WebPushAdapter's own
// comment on this repo's "no unit test for thin infra adapters" convention).
class FakePushNotificationPort extends PushNotificationPort {
  async send(): Promise<void> {}
}

const USER_1: CurrentUserPayload = {
  id: 'user-1',
  email: 'user1@test.dev',
  name: 'Joueur 1',
};

const USER_2: CurrentUserPayload = {
  id: 'user-2',
  email: 'user2@test.dev',
  name: 'Joueur 2',
};

interface PushSubscriptionApiResponse {
  id: string;
  endpoint: string;
  createdAt: string;
}

describe('PushSubscriptionController (integration)', () => {
  let app: INestApplication;
  let currentUser: CurrentUserPayload;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ VAPID_PUBLIC_KEY: 'test-vapid-public-key' })],
        }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [PushSubscriptionOrmEntity],
        }),
        PushSubscriptionModule,
      ],
    })
      .overrideProvider(PushNotificationPort)
      .useClass(FakePushNotificationPort)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    // No AuthModule/JwtAuthGuard in this isolated module test (out of this
    // task's scope, already covered by its own tests) - simulate an
    // authenticated request the same way the guard would.
    app.use(
      (req: { user?: CurrentUserPayload }, _res: unknown, next: () => void) => {
        req.user = currentUser;
        next();
      },
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    currentUser = USER_1;
  });

  it('exposes the VAPID public key so the browser can subscribe', async () => {
    const response = await request(app.getHttpServer()).get(
      '/push-subscriptions/vapid-public-key',
    );

    expect(response.status).toBe(200);
    expect((response.body as { publicKey: string }).publicKey).toBe(
      'test-vapid-public-key',
    );
  });

  it('registers a browser push subscription for the caller', async () => {
    const response = await request(app.getHttpServer())
      .post('/push-subscriptions')
      .send({
        endpoint: 'https://push.example.com/subscription/abc',
        keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
      });

    const body = response.body as PushSubscriptionApiResponse;
    expect(response.status).toBe(201);
    expect(body.endpoint).toBe('https://push.example.com/subscription/abc');
    expect(body.id).toBeTruthy();
  });

  it('rejects a registration missing the keys', async () => {
    const response = await request(app.getHttpServer())
      .post('/push-subscriptions')
      .send({ endpoint: 'https://push.example.com/subscription/abc' });

    expect(response.status).toBe(400);
  });

  it('deletes a subscription owned by the caller', async () => {
    const created = await request(app.getHttpServer())
      .post('/push-subscriptions')
      .send({
        endpoint: 'https://push.example.com/subscription/to-delete',
        keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
      });
    const { id } = created.body as PushSubscriptionApiResponse;

    const response = await request(app.getHttpServer()).delete(
      `/push-subscriptions/${id}`,
    );

    expect(response.status).toBe(204);
  });

  it('rejects deleting a subscription owned by another user', async () => {
    const created = await request(app.getHttpServer())
      .post('/push-subscriptions')
      .send({
        endpoint: 'https://push.example.com/subscription/other-owner',
        keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
      });
    const { id } = created.body as PushSubscriptionApiResponse;

    currentUser = USER_2;
    const response = await request(app.getHttpServer()).delete(
      `/push-subscriptions/${id}`,
    );

    expect(response.status).toBe(403);
  });

  it('returns 404 when deleting a subscription that does not exist', async () => {
    const response = await request(app.getHttpServer()).delete(
      '/push-subscriptions/missing-id',
    );

    expect(response.status).toBe(404);
  });
});
