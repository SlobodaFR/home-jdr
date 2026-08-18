import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { Character } from '../../../domain/character/character';
import { CharacterRepository } from '../../../domain/character/character.repository';
import { GameSystem } from '../../../domain/game-system/game-system';
import { GameSystemRepository } from '../../../domain/game-system/game-system.repository';
import { GameSession } from '../../../domain/session/game-session';
import { GameSessionRepository } from '../../../domain/session/game-session.repository';
import { SessionPlayer } from '../../../domain/session/session-player';
import { SessionPlayerRepository } from '../../../domain/session/session-player.repository';
import { CharacterOrmEntity } from '../../../infrastructure/persistence/entities/character.orm-entity';
import { GameSessionOrmEntity } from '../../../infrastructure/persistence/entities/game-session.orm-entity';
import { GameSystemOrmEntity } from '../../../infrastructure/persistence/entities/game-system.orm-entity';
import { SessionPlayerOrmEntity } from '../../../infrastructure/persistence/entities/session-player.orm-entity';
import { UserProfileOrmEntity } from '../../../infrastructure/persistence/entities/user-profile.orm-entity';
import { AdminSessionsModule } from '../modules/admin-sessions.module';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

const ADMIN_USER: CurrentUserPayload = {
  id: 'admin-1',
  email: 'admin@test.dev',
  name: 'Admin',
};

const NON_ADMIN_USER: CurrentUserPayload = {
  id: 'player-1',
  email: 'player@test.dev',
  name: 'Joueur',
};

interface AdminSessionApiResponse {
  id: string;
  name: string;
  gameSystemName: string;
  status: string;
  currentTurnNumber: number;
  participants: { userId: string; characterName: string }[];
}

const CHARACTER_SHEET_SCHEMA = {
  hitPoints: { defaultMax: 20 },
  inventory: { defaultItems: [] },
  customAttributes: [],
};

function buildGameSystem(id: string, name: string): GameSystem {
  return GameSystem.create({
    id,
    name,
    description: '',
    adaptedForChildren: false,
    rulesText: '',
    rulesSourceFileName: `${id}.pdf`,
    characterSheetSchema: CHARACTER_SHEET_SCHEMA,
    mechanicalActions: [],
  });
}

function buildCharacter(
  id: string,
  sessionId: string,
  ownerUserId: string,
  name: string,
): Character {
  return Character.create({
    id,
    gameSystemId: 'irrelevant',
    sessionId,
    ownerUserId,
    name,
    hitPointsMax: 20,
    hitPointsCurrent: 20,
    inventory: [],
    customAttributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('AdminSessionsController (integration)', () => {
  let app: INestApplication;
  let currentUser: CurrentUserPayload;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ ADMIN_EMAILS: 'admin@test.dev' })],
        }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [
            GameSessionOrmEntity,
            SessionPlayerOrmEntity,
            GameSystemOrmEntity,
            CharacterOrmEntity,
            UserProfileOrmEntity,
          ],
        }),
        AdminSessionsModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.use(
      (req: { user?: CurrentUserPayload }, _res: unknown, next: () => void) => {
        req.user = currentUser;
        next();
      },
    );
    await app.init();

    const gameSystemRepository = moduleRef.get(GameSystemRepository);
    await gameSystemRepository.save(
      buildGameSystem('game-system-dnd', 'Donjons & Dragons'),
    );
    await gameSystemRepository.save(
      buildGameSystem('game-system-coc', "L'Appel de Cthulhu"),
    );

    const gameSessionRepository = moduleRef.get(GameSessionRepository);
    await gameSessionRepository.save(
      GameSession.create({
        id: 'session-solo',
        gameSystemId: 'game-system-dnd',
        name: 'Aventure en solo',
        inviteCode: 'AAAA11',
        createdByUserId: 'user-gm',
      }),
    );
    await gameSessionRepository.save(
      GameSession.create({
        id: 'session-group',
        gameSystemId: 'game-system-coc',
        name: 'Enquete a Arkham',
        inviteCode: 'BBBB22',
        createdByUserId: 'user-host',
      }),
    );

    const sessionPlayerRepository = moduleRef.get(SessionPlayerRepository);
    await sessionPlayerRepository.save(
      SessionPlayer.create({
        sessionId: 'session-solo',
        userId: 'user-gm',
        characterId: 'character-1',
      }),
    );
    await sessionPlayerRepository.save(
      SessionPlayer.create({
        sessionId: 'session-group',
        userId: 'user-host',
        characterId: 'character-2',
      }),
    );
    await sessionPlayerRepository.save(
      SessionPlayer.create({
        sessionId: 'session-group',
        userId: 'user-guest',
        characterId: 'character-3',
      }),
    );

    const characterRepository = moduleRef.get(CharacterRepository);
    await characterRepository.save(
      buildCharacter('character-1', 'session-solo', 'user-gm', 'Solo Hero'),
    );
    await characterRepository.save(
      buildCharacter(
        'character-2',
        'session-group',
        'user-host',
        'Investigateur A',
      ),
    );
    await characterRepository.save(
      buildCharacter(
        'character-3',
        'session-group',
        'user-guest',
        'Investigateur B',
      ),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    currentUser = ADMIN_USER;
  });

  it('returns every session in the system with the resolved game system name and participants', async () => {
    const response = await request(app.getHttpServer()).get('/admin/sessions');

    expect(response.status).toBe(200);
    const body = response.body as AdminSessionApiResponse[];
    expect(body).toHaveLength(2);

    const solo = body.find((s) => s.id === 'session-solo');
    expect(solo?.gameSystemName).toBe('Donjons & Dragons');
    expect(solo?.participants).toHaveLength(1);
    expect(solo?.participants[0]).toMatchObject({
      userId: 'user-gm',
      characterName: 'Solo Hero',
    });

    const group = body.find((s) => s.id === 'session-group');
    expect(group?.gameSystemName).toBe("L'Appel de Cthulhu");
    expect(group?.participants).toHaveLength(2);
    expect(group?.participants.map((p) => p.characterName).sort()).toEqual([
      'Investigateur A',
      'Investigateur B',
    ]);
  });

  it('rejects a non-admin caller (403)', async () => {
    currentUser = NON_ADMIN_USER;

    const response = await request(app.getHttpServer()).get('/admin/sessions');

    expect(response.status).toBe(403);
  });
});
