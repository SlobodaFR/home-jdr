import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { Character } from '../../../domain/character/character';
import { CharacterRepository } from '../../../domain/character/character.repository';
import { GameSystem } from '../../../domain/game-system/game-system';
import { GameSystemRepository } from '../../../domain/game-system/game-system.repository';
import {
  CharacterCreationAssistOutput,
  LlmGameMasterPort,
  SceneResolutionInput,
  SceneResolutionOutput,
} from '../../../domain/session/llm-game-master.port';
import { SessionPlayer } from '../../../domain/session/session-player';
import { SessionPlayerRepository } from '../../../domain/session/session-player.repository';
import { AppSettingOrmEntity } from '../../../infrastructure/persistence/entities/app-setting.orm-entity';
import { CharacterCreationSessionOrmEntity } from '../../../infrastructure/persistence/entities/character-creation-session.orm-entity';
import { CharacterOrmEntity } from '../../../infrastructure/persistence/entities/character.orm-entity';
import { GameSessionOrmEntity } from '../../../infrastructure/persistence/entities/game-session.orm-entity';
import { GameSystemOrmEntity } from '../../../infrastructure/persistence/entities/game-system.orm-entity';
import { LlmUsageRecordOrmEntity } from '../../../infrastructure/persistence/entities/llm-usage-record.orm-entity';
import { LlmUsageRecord } from '../../../domain/usage-quota/llm-usage-record';
import { LlmUsageRecordRepository } from '../../../domain/usage-quota/llm-usage-record.repository';
import { PendingCharacterDeltaOrmEntity } from '../../../infrastructure/persistence/entities/pending-character-delta.orm-entity';
import { SessionPlayerOrmEntity } from '../../../infrastructure/persistence/entities/session-player.orm-entity';
import { TurnResolutionOrmEntity } from '../../../infrastructure/persistence/entities/turn-resolution.orm-entity';
import { TurnSubmissionOrmEntity } from '../../../infrastructure/persistence/entities/turn-submission.orm-entity';
import { UserProfileOrmEntity } from '../../../infrastructure/persistence/entities/user-profile.orm-entity';
import { SessionModule } from '../modules/session.module';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

/**
 * Records every `resolveScene()` call so the "no LLM call consumed when
 * quota exhausted" acceptance criterion (`tasks/08-admin-quotas-cost-guardrails.md`)
 * is verified with a call-count assertion, not just the HTTP status code.
 */
class SpyingLlmGameMasterPort extends LlmGameMasterPort {
  public resolveSceneCallCount = 0;

  resolveScene(input: SceneResolutionInput): Promise<SceneResolutionOutput> {
    this.resolveSceneCallCount += 1;
    return Promise.resolve({
      narrationText: input.submittedActions
        .map((action) => `${action.playerId} : ${action.actionText}`)
        .join('\n'),
      characterDeltas: [],
    });
  }

  summarize(): Promise<string> {
    return Promise.resolve('');
  }

  assistCharacterCreation(): Promise<CharacterCreationAssistOutput> {
    throw new Error('not used in this spec');
  }

  narrateOpening(): Promise<{ narrationText: string }> {
    throw new Error('not used in this spec');
  }
}

const GAME_SYSTEM_ID = 'game-system-quota-test';
const CREATOR: CurrentUserPayload = {
  id: 'user-quota-1',
  email: 'quota@test.dev',
  name: 'Quota Test',
};

function buildGameSystem(): GameSystem {
  return GameSystem.create({
    id: GAME_SYSTEM_ID,
    name: 'JdR de test quota',
    description: 'desc',
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

/**
 * End-to-end (HTTP layer) coverage of `tasks/08-admin-quotas-cost-guardrails.md`'s
 * main acceptance criterion: once the daily quota is exhausted, a turn
 * submission that would trigger a resolution fails cleanly (429) WITHOUT
 * calling `LlmGameMasterPort` - see `QuotaExceededFilter` and the
 * `UsageQuotaPort.checkQuotaAvailable()` guard at the top of
 * `ResolveSceneUseCase.resolve()`.
 */
describe('SessionController - quota guard-rail (integration)', () => {
  let app: INestApplication;
  let llm: SpyingLlmGameMasterPort;
  let llmUsageRecordRepository: LlmUsageRecordRepository;
  let characterRepository: CharacterRepository;
  let sessionPlayerRepository: SessionPlayerRepository;

  beforeAll(async () => {
    llm = new SpyingLlmGameMasterPort();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          // A single scene_resolution call is seeded below (real "now",
          // same clock the real SystemClockAdapter uses) - quota=1 means
          // that seeded call already exhausts it for today.
          load: [() => ({ DAILY_LLM_QUOTA: '1' })],
        }),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [
            GameSystemOrmEntity,
            UserProfileOrmEntity,
            GameSessionOrmEntity,
            SessionPlayerOrmEntity,
            TurnSubmissionOrmEntity,
            TurnResolutionOrmEntity,
            CharacterOrmEntity,
            PendingCharacterDeltaOrmEntity,
            LlmUsageRecordOrmEntity,
            AppSettingOrmEntity,
            CharacterCreationSessionOrmEntity,
          ],
        }),
        SessionModule,
      ],
    })
      .overrideProvider(LlmGameMasterPort)
      .useValue(llm)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.use(
      (req: { user?: CurrentUserPayload }, _res: unknown, next: () => void) => {
        req.user = CREATOR;
        next();
      },
    );
    await app.init();

    const gameSystemRepository = moduleRef.get(GameSystemRepository);
    await gameSystemRepository.save(buildGameSystem());

    characterRepository = moduleRef.get(CharacterRepository);
    sessionPlayerRepository = moduleRef.get(SessionPlayerRepository);

    llmUsageRecordRepository = moduleRef.get(LlmUsageRecordRepository);
    await llmUsageRecordRepository.save(
      LlmUsageRecord.create({
        sessionId: 'unrelated-session',
        turnNumber: 1,
        provider: 'claude',
        callType: 'scene_resolution',
        occurredAt: new Date(),
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 with a clean error body and never calls the LLM once the daily quota is exhausted', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/sessions')
      .send({
        gameSystemId: GAME_SYSTEM_ID,
        name: 'Partie sans quota',
        charactersVisibleToOthers: false,
      });
    expect(createResponse.status).toBe(201);
    const sessionId = (createResponse.body as { id: string }).id;

    // Seat the creator directly (bypassing the character-creation chat,
    // which is itself quota-gated and covered by its own use-case spec) so a
    // turn submission is possible - this test's concern is exclusively
    // ResolveSceneUseCase's quota gate.
    const character = Character.fromSchema({
      id: 'character-quota-test',
      gameSystemId: GAME_SYSTEM_ID,
      sessionId,
      ownerUserId: CREATOR.id,
      name: 'Gimli',
      schema: {
        baseAttributes: { hitPoints: { max: 20 }, inventory: [] },
        customAttributes: [],
      },
      now: new Date(),
    });
    await characterRepository.save(character);
    await sessionPlayerRepository.save(
      SessionPlayer.create({
        sessionId,
        userId: CREATOR.id,
        characterId: character.id,
      }),
    );

    const turnResponse = await request(app.getHttpServer())
      .post(`/sessions/${sessionId}/turns`)
      .send({ actionText: "J'ouvre la porte" });

    expect(turnResponse.status).toBe(429);
    expect(turnResponse.body).toMatchObject({ statusCode: 429 });
    expect(typeof (turnResponse.body as { message: string }).message).toBe(
      'string',
    );

    // The heart of the acceptance criterion: no billed call happened.
    expect(llm.resolveSceneCallCount).toBe(0);
  });
});
