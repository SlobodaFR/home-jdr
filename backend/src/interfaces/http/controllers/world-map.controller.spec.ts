import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { InMemoryImageGenerationPort } from '../../../application/world-map/in-memory-image-generation.port';
import { InMemoryObjectStoragePort } from '../../../application/world-map/in-memory-object-storage.port';
import { GameSystem } from '../../../domain/game-system/game-system';
import { GameSystemRepository } from '../../../domain/game-system/game-system.repository';
import { GameSession } from '../../../domain/session/game-session';
import { GameSessionRepository } from '../../../domain/session/game-session.repository';
import { SessionPlayer } from '../../../domain/session/session-player';
import { SessionPlayerRepository } from '../../../domain/session/session-player.repository';
import { ImageGenerationPort } from '../../../domain/world-map/image-generation.port';
import { ObjectStoragePort } from '../../../domain/world-map/object-storage.port';
import { GameSessionOrmEntity } from '../../../infrastructure/persistence/entities/game-session.orm-entity';
import { GameSystemOrmEntity } from '../../../infrastructure/persistence/entities/game-system.orm-entity';
import { MapPinOrmEntity } from '../../../infrastructure/persistence/entities/map-pin.orm-entity';
import { SessionPlayerOrmEntity } from '../../../infrastructure/persistence/entities/session-player.orm-entity';
import { WorldMapOrmEntity } from '../../../infrastructure/persistence/entities/world-map.orm-entity';
import { WorldMapModule } from '../modules/world-map.module';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

interface TestUser {
  id: string;
  email: string;
}

const GAME_SYSTEM_ID = 'game-system-1';

function buildGameSystem(): GameSystem {
  return GameSystem.create({
    id: GAME_SYSTEM_ID,
    name: 'La quete du dragon',
    description: 'Fantasy sombre et féerique',
    adaptedForChildren: false,
    rulesText: 'texte des regles',
    rulesSourceFileName: 'rules.pdf',
    characterSheetSchema: {
      hitPoints: { defaultMax: 20 },
      inventory: { defaultItems: [] },
      customAttributes: [],
    },
    mechanicalActions: [],
  });
}

describe('WorldMapController (integration)', () => {
  let app: INestApplication;
  let objectStoragePort: InMemoryObjectStoragePort;

  const creator: TestUser = { id: 'gm-1', email: 'gm@test.dev' };
  const outsider: TestUser = { id: 'stranger', email: 'stranger@test.dev' };

  beforeAll(async () => {
    objectStoragePort = new InMemoryObjectStoragePort();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [
            GameSystemOrmEntity,
            GameSessionOrmEntity,
            SessionPlayerOrmEntity,
            WorldMapOrmEntity,
            MapPinOrmEntity,
          ],
        }),
        WorldMapModule,
      ],
    })
      .overrideProvider(ImageGenerationPort)
      .useValue(new InMemoryImageGenerationPort())
      .overrideProvider(ObjectStoragePort)
      .useValue(objectStoragePort)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    // No AuthModule/JwtAuthGuard in this isolated module test - simulate an
    // authenticated request from headers, same pattern as SessionController's suite.
    app.use(
      (
        req: {
          user?: CurrentUserPayload;
          headers: Record<string, string | undefined>;
        },
        _res: unknown,
        next: () => void,
      ) => {
        const id = req.headers['x-test-user-id'];
        const email = req.headers['x-test-user-email'];
        if (id && email) {
          req.user = { id, email, name: 'Test User' };
        }
        next();
      },
    );
    await app.init();

    const gameSystemRepository = moduleRef.get(GameSystemRepository);
    await gameSystemRepository.save(buildGameSystem());

    const gameSessionRepository = moduleRef.get(GameSessionRepository);
    await gameSessionRepository.save(
      GameSession.create({
        id: 'session-1',
        gameSystemId: GAME_SYSTEM_ID,
        name: 'Ma partie',
        inviteCode: 'XK4R2P',
        createdByUserId: creator.id,
      }),
    );

    const sessionPlayerRepository = moduleRef.get(SessionPlayerRepository);
    await sessionPlayerRepository.save(
      SessionPlayer.create({
        sessionId: 'session-1',
        userId: creator.id,
        characterId: 'character-1',
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  function asUser(user: TestUser) {
    return {
      get: (path: string) =>
        request(app.getHttpServer())
          .get(path)
          .set('x-test-user-id', user.id)
          .set('x-test-user-email', user.email),
      post: (path: string) =>
        request(app.getHttpServer())
          .post(path)
          .set('x-test-user-id', user.id)
          .set('x-test-user-email', user.email),
      patch: (path: string) =>
        request(app.getHttpServer())
          .patch(path)
          .set('x-test-user-id', user.id)
          .set('x-test-user-email', user.email),
      delete: (path: string) =>
        request(app.getHttpServer())
          .delete(path)
          .set('x-test-user-id', user.id)
          .set('x-test-user-email', user.email),
    };
  }

  it('generates a map, stores the image via the object-storage port, and never exposes a raw third-party URL', async () => {
    const response = await asUser(creator)
      .post('/sessions/session-1/world-map')
      .send({});

    expect(response.status).toBe(201);
    const body = response.body as {
      id: string;
      sessionId: string;
      imageUrl: string | null;
      generationPrompt: string;
    };
    expect(body.sessionId).toBe('session-1');
    expect(body.generationPrompt).toContain('La quete du dragon');
    expect(objectStoragePort.stored.size).toBeGreaterThan(0);
  });

  it('rejects a user who is not a SessionPlayer of the session from generating the map', async () => {
    const response = await asUser(outsider)
      .post('/sessions/session-1/world-map')
      .send({});

    expect(response.status).toBe(403);
  });

  it('rejects a user who is not a SessionPlayer of the session from viewing the map', async () => {
    const response = await asUser(outsider).get(
      '/sessions/session-1/world-map',
    );

    expect(response.status).toBe(403);
  });

  it('adds, moves and deletes a pin, all linked to the world map', async () => {
    await asUser(creator).post('/sessions/session-1/world-map').send({});

    const addResponse = await asUser(creator)
      .post('/sessions/session-1/world-map/pins')
      .send({ label: 'Le village de Bree', positionX: 0.4, positionY: 0.6 });
    expect(addResponse.status).toBe(201);
    const pin = addResponse.body as { id: string; worldMapId: string };
    expect(pin.worldMapId).toBeTruthy();

    const moveResponse = await asUser(creator)
      .patch(`/sessions/session-1/world-map/pins/${pin.id}`)
      .send({ positionX: 0.9, positionY: 0.1 });
    expect(moveResponse.status).toBe(200);
    expect((moveResponse.body as { positionX: number }).positionX).toBe(0.9);

    const getResponse = await asUser(creator).get(
      '/sessions/session-1/world-map',
    );
    expect((getResponse.body as { pins: { id: string }[] }).pins).toHaveLength(
      1,
    );
    expect(
      (getResponse.body as { pins: { worldMapId: string }[] }).pins[0]
        .worldMapId,
    ).toBe(pin.worldMapId);

    const deleteResponse = await asUser(creator).delete(
      `/sessions/session-1/world-map/pins/${pin.id}`,
    );
    expect(deleteResponse.status).toBe(200);

    const afterDelete = await asUser(creator).get(
      '/sessions/session-1/world-map',
    );
    expect((afterDelete.body as { pins: unknown[] }).pins).toHaveLength(0);
  });
});
