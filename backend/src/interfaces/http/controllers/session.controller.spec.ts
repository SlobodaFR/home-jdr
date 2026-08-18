import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { CharacterStateDelta } from '../../../domain/character/character-state-delta';
import { GameSystem } from '../../../domain/game-system/game-system';
import { GameSystemRepository } from '../../../domain/game-system/game-system.repository';
import {
  CharacterCreationAssistInput,
  CharacterCreationAssistOutput,
  LlmGameMasterPort,
  SceneResolutionInput,
  SceneResolutionOutput,
} from '../../../domain/session/llm-game-master.port';
import { UserProfile } from '../../../domain/user/user-profile';
import { UserProfileRepository } from '../../../domain/user/user-profile.repository';
import { AppSettingOrmEntity } from '../../../infrastructure/persistence/entities/app-setting.orm-entity';
import { CharacterCreationSessionOrmEntity } from '../../../infrastructure/persistence/entities/character-creation-session.orm-entity';
import { CharacterOrmEntity } from '../../../infrastructure/persistence/entities/character.orm-entity';
import { GameSessionOrmEntity } from '../../../infrastructure/persistence/entities/game-session.orm-entity';
import { GameSystemOrmEntity } from '../../../infrastructure/persistence/entities/game-system.orm-entity';
import { LlmUsageRecordOrmEntity } from '../../../infrastructure/persistence/entities/llm-usage-record.orm-entity';
import { MapPinOrmEntity } from '../../../infrastructure/persistence/entities/map-pin.orm-entity';
import { PendingCharacterDeltaOrmEntity } from '../../../infrastructure/persistence/entities/pending-character-delta.orm-entity';
import { SessionPlayerOrmEntity } from '../../../infrastructure/persistence/entities/session-player.orm-entity';
import { TurnResolutionOrmEntity } from '../../../infrastructure/persistence/entities/turn-resolution.orm-entity';
import { TurnSubmissionOrmEntity } from '../../../infrastructure/persistence/entities/turn-submission.orm-entity';
import { UserProfileOrmEntity } from '../../../infrastructure/persistence/entities/user-profile.orm-entity';
import { WorldMapOrmEntity } from '../../../infrastructure/persistence/entities/world-map.orm-entity';
import { CharacterCreationModule } from '../modules/character-creation.module';
import { SessionModule } from '../modules/session.module';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

/**
 * `04-llm-orchestration` wires `SceneResolverPort` to the real
 * `ResolveSceneUseCase`, which calls out to `LlmGameMasterPort`. This
 * controller suite tests HTTP/session-lifecycle plumbing, not the LLM
 * adapters themselves (see `claude-game-master.adapter.spec.ts` /
 * `openai-game-master.adapter.spec.ts` for that) - so it overrides
 * `LlmGameMasterPort` with a deterministic fake, exactly like it already
 * fakes authentication via the `x-test-user-*` headers below.
 *
 * `assistCharacterCreation()` is a similarly deterministic fake: it always
 * proposes the player's message verbatim as the draft character's name, so
 * this suite's helper (`seatPlayer()`) can finalize a character in exactly
 * one message + one finalize call.
 */
class FakeLlmGameMasterPort extends LlmGameMasterPort {
  resolveScene(input: SceneResolutionInput): Promise<SceneResolutionOutput> {
    return Promise.resolve({
      narrationText: input.submittedActions
        .map((action) => `${action.playerId} : ${action.actionText}`)
        .join('\n'),
      // Always propose one delta on the first submitter's character, so the
      // validate/reject HTTP endpoints have something to exercise.
      characterDeltas:
        input.submittedActions.length > 0
          ? [
              {
                characterId: input.submittedActions[0].characterId,
                delta: CharacterStateDelta.create({ hitPoints: -1 }),
              },
            ]
          : [],
    });
  }

  summarize(): Promise<string> {
    return Promise.resolve('');
  }

  assistCharacterCreation(
    input: CharacterCreationAssistInput,
  ): Promise<CharacterCreationAssistOutput> {
    const lastUserMessage = [...input.messages]
      .reverse()
      .find((message) => message.role === 'user');
    return Promise.resolve({
      assistantMessage: 'Bien noté.',
      draftUpdates: { name: lastUserMessage?.content ?? 'Héros' },
      readyToFinalize: true,
    });
  }

  narrateOpening(): Promise<{ narrationText: string }> {
    return Promise.resolve({
      narrationText: "L'aventure commence.",
    });
  }
}

interface TestUser {
  id: string;
  email: string;
}

const CHILD_ADAPTED_GAME_SYSTEM_ID = 'game-system-kids';
const ADULT_ONLY_GAME_SYSTEM_ID = 'game-system-adults';
const MECHANICAL_GAME_SYSTEM_ID = 'game-system-mechanical';

function buildGameSystem(
  id: string,
  adaptedForChildren: boolean,
  mechanicalActions: {
    actionKey: string;
    label: string;
    diceFormula: string;
  }[] = [],
): GameSystem {
  return GameSystem.create({
    id,
    name: adaptedForChildren ? 'JdR pour enfants' : 'JdR pour adultes',
    description: 'JdR de test',
    adaptedForChildren,
    rulesText: 'texte des regles',
    rulesSourceFileName: 'rules.pdf',
    characterSheetSchema: {
      hitPoints: { defaultMax: 20 },
      inventory: { defaultItems: ['torche'] },
      customAttributes: [],
    },
    mechanicalActions,
  });
}

describe('SessionController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        // SubmitTurnActionUseCase emits a TurnResolvedEvent on resolution
        // (see 06-notifications-push.md) - needs the event bus available.
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
            WorldMapOrmEntity,
            MapPinOrmEntity,
          ],
        }),
        SessionModule,
        CharacterCreationModule,
      ],
    })
      .overrideProvider(LlmGameMasterPort)
      .useClass(FakeLlmGameMasterPort)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    // No AuthModule/JwtAuthGuard in this isolated module test - simulate an
    // authenticated request from headers, the same way GameSystemController's
    // suite simulates a single fixed user.
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
    await gameSystemRepository.save(
      buildGameSystem(ADULT_ONLY_GAME_SYSTEM_ID, false),
    );
    await gameSystemRepository.save(
      buildGameSystem(CHILD_ADAPTED_GAME_SYSTEM_ID, true),
    );
    await gameSystemRepository.save(
      buildGameSystem(MECHANICAL_GAME_SYSTEM_ID, false, [
        {
          actionKey: 'melee-attack',
          label: 'Attaque au corps a corps',
          diceFormula: '1d20+3',
        },
      ]),
    );

    const userProfileRepository = moduleRef.get(UserProfileRepository);
    await userProfileRepository.save(
      UserProfile.create({ userId: 'child-1', role: 'child' }),
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
      delete: (path: string) =>
        request(app.getHttpServer())
          .delete(path)
          .set('x-test-user-id', user.id)
          .set('x-test-user-email', user.email),
    };
  }

  /**
   * Advances the given user's character-creation chat by one message (the
   * fake LLM proposes `characterName` as the draft name from it - see
   * `FakeLlmGameMasterPort.assistCharacterCreation()`) then finalizes it.
   * This is the only way a caller becomes an active `SessionPlayer` now
   * that `CreateSessionUseCase`/`JoinSessionUseCase` no longer seat one
   * synchronously - most turn-submission tests below need this first.
   */
  async function seatPlayer(
    user: TestUser,
    characterCreationSessionId: string,
    characterName: string,
  ) {
    await asUser(user)
      .post(
        `/character-creation-sessions/${characterCreationSessionId}/messages`,
      )
      .send({ message: characterName });
    const finalizeResponse = await asUser(user)
      .post(
        `/character-creation-sessions/${characterCreationSessionId}/finalize`,
      )
      .send();
    return finalizeResponse;
  }

  const creator: TestUser = { id: 'user-creator', email: 'creator@test.dev' };
  const joiner: TestUser = { id: 'user-joiner', email: 'joiner@test.dev' };
  const child: TestUser = { id: 'child-1', email: 'child@test.dev' };

  it('lets a user create a session and get an invite code, and a second user join with that code', async () => {
    const createResponse = await asUser(creator).post('/sessions').send({
      gameSystemId: ADULT_ONLY_GAME_SYSTEM_ID,
      name: 'La quete du dragon',
      charactersVisibleToOthers: false,
    });

    expect(createResponse.status).toBe(201);
    const inviteCode = (createResponse.body as { inviteCode: string })
      .inviteCode;
    expect(typeof inviteCode).toBe('string');
    expect(inviteCode.length).toBeGreaterThan(0);
    expect(
      (createResponse.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
    ).toBeTruthy();

    const joinResponse = await asUser(joiner).post('/sessions/join').send({
      inviteCode,
    });

    expect(joinResponse.status).toBe(201);
    expect((joinResponse.body as { id: string }).id).toBe(
      (createResponse.body as { id: string }).id,
    );
    expect(
      (joinResponse.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
    ).toBeTruthy();
  });

  it('rejects a child account joining a session whose JdR is not adapted for children, with a clear message', async () => {
    const createResponse = await asUser(creator).post('/sessions').send({
      gameSystemId: ADULT_ONLY_GAME_SYSTEM_ID,
      name: 'Partie adulte',
      charactersVisibleToOthers: false,
    });
    const inviteCode = (createResponse.body as { inviteCode: string })
      .inviteCode;

    const joinResponse = await asUser(child).post('/sessions/join').send({
      inviteCode,
    });

    expect(joinResponse.status).toBe(403);
    expect((joinResponse.body as { message: string }).message).toMatch(
      /enfant/,
    );
  });

  it('allows a child account to join a session whose JdR is adapted for children', async () => {
    const createResponse = await asUser(creator).post('/sessions').send({
      gameSystemId: CHILD_ADAPTED_GAME_SYSTEM_ID,
      name: 'Partie familiale',
      charactersVisibleToOthers: false,
    });
    const inviteCode = (createResponse.body as { inviteCode: string })
      .inviteCode;

    const joinResponse = await asUser(child).post('/sessions/join').send({
      inviteCode,
    });

    expect(joinResponse.status).toBe(201);
  });

  it('resolves a solo session immediately and exposes the resolution through polling', async () => {
    const createResponse = await asUser(creator).post('/sessions').send({
      gameSystemId: ADULT_ONLY_GAME_SYSTEM_ID,
      name: 'Partie solo',
      charactersVisibleToOthers: false,
    });
    const sessionId = (createResponse.body as { id: string }).id;
    await seatPlayer(
      creator,
      (createResponse.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Aragorn',
    );

    const turnResponse = await asUser(creator)
      .post(`/sessions/${sessionId}/turns`)
      .send({ actionText: "J'ouvre la porte" });

    expect(turnResponse.status).toBe(201);
    expect((turnResponse.body as { resolved: boolean }).resolved).toBe(true);

    const stateResponse = await asUser(creator).get(
      `/sessions/${sessionId}/state`,
    );
    expect(stateResponse.status).toBe(200);
    const state = stateResponse.body as {
      session: { status: string };
      recentTurns: { turnNumber: number }[];
    };
    expect(state.session.status).toBe('narrating');
    expect(state.recentTurns).toHaveLength(1);
  });

  it('waits for every player of a 3-player session before resolving', async () => {
    const createResponse = await asUser(creator).post('/sessions').send({
      gameSystemId: ADULT_ONLY_GAME_SYSTEM_ID,
      name: 'Partie a trois',
      charactersVisibleToOthers: false,
    });
    const sessionId = (createResponse.body as { id: string }).id;
    const inviteCode = (createResponse.body as { inviteCode: string })
      .inviteCode;
    await seatPlayer(
      creator,
      (createResponse.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Joueur 1',
    );

    const playerTwo: TestUser = { id: 'user-3p-2', email: 'p2@test.dev' };
    const playerThree: TestUser = { id: 'user-3p-3', email: 'p3@test.dev' };
    const joinTwo = await asUser(playerTwo)
      .post('/sessions/join')
      .send({ inviteCode });
    await seatPlayer(
      playerTwo,
      (joinTwo.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Joueur 2',
    );
    const joinThree = await asUser(playerThree)
      .post('/sessions/join')
      .send({ inviteCode });
    await seatPlayer(
      playerThree,
      (joinThree.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Joueur 3',
    );

    const first = await asUser(creator)
      .post(`/sessions/${sessionId}/turns`)
      .send({ actionText: 'Action 1' });
    expect((first.body as { resolved: boolean }).resolved).toBe(false);

    const second = await asUser(playerTwo)
      .post(`/sessions/${sessionId}/turns`)
      .send({ actionText: 'Action 2' });
    expect((second.body as { resolved: boolean }).resolved).toBe(false);

    const third = await asUser(playerThree)
      .post(`/sessions/${sessionId}/turns`)
      .send({ actionText: 'Action 3' });
    expect((third.body as { resolved: boolean }).resolved).toBe(true);
  });

  it('lists the caller sessions on GET /sessions ("Mes parties")', async () => {
    const solo: TestUser = { id: 'user-mine', email: 'mine@test.dev' };
    await asUser(solo).post('/sessions').send({
      gameSystemId: ADULT_ONLY_GAME_SYSTEM_ID,
      name: 'Ma partie a moi',
      charactersVisibleToOthers: false,
    });

    const listResponse = await asUser(solo).get('/sessions');

    expect(listResponse.status).toBe(200);
    const names = (listResponse.body as { name: string }[]).map((s) => s.name);
    expect(names).toContain('Ma partie a moi');
  });

  it('rolls dice for a mechanical action and exposes the roll + a pending delta through polling', async () => {
    const createResponse = await asUser(creator).post('/sessions').send({
      gameSystemId: MECHANICAL_GAME_SYSTEM_ID,
      name: 'Partie avec des des',
      charactersVisibleToOthers: false,
    });
    const sessionId = (createResponse.body as { id: string }).id;
    await seatPlayer(
      creator,
      (createResponse.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Grognak',
    );

    const turnResponse = await asUser(creator)
      .post(`/sessions/${sessionId}/turns`)
      .send({
        actionText: 'Je frappe le gobelin',
        mechanicalActionKey: 'melee-attack',
      });
    expect(turnResponse.status).toBe(201);

    const stateResponse = await asUser(creator).get(
      `/sessions/${sessionId}/state`,
    );
    const state = stateResponse.body as {
      recentTurns: {
        diceRolls: { actionKey: string; formula: string; total: number }[];
        pendingDeltas: { id: string; status: string; hitPoints?: number }[];
      }[];
    };

    expect(state.recentTurns).toHaveLength(1);
    expect(state.recentTurns[0].diceRolls).toHaveLength(1);
    expect(state.recentTurns[0].diceRolls[0].actionKey).toBe('melee-attack');
    expect(state.recentTurns[0].diceRolls[0].formula).toBe('1d20+3');
    expect(state.recentTurns[0].pendingDeltas).toHaveLength(1);
    expect(state.recentTurns[0].pendingDeltas[0].status).toBe('pending');
    expect(state.recentTurns[0].pendingDeltas[0].hitPoints).toBe(-1);
  });

  it('validates a pending delta via POST .../deltas/:id/validate, and rejects a double-validate', async () => {
    const createResponse = await asUser(creator).post('/sessions').send({
      gameSystemId: ADULT_ONLY_GAME_SYSTEM_ID,
      name: 'Partie avec deltas',
      charactersVisibleToOthers: false,
    });
    const sessionId = (createResponse.body as { id: string }).id;
    await seatPlayer(
      creator,
      (createResponse.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Grognak',
    );

    await asUser(creator)
      .post(`/sessions/${sessionId}/turns`)
      .send({ actionText: 'Action' });

    const stateResponse = await asUser(creator).get(
      `/sessions/${sessionId}/state`,
    );
    const state = stateResponse.body as {
      recentTurns: { turnNumber: number; pendingDeltas: { id: string }[] }[];
    };
    const turnNumber = state.recentTurns[0].turnNumber;
    const deltaId = state.recentTurns[0].pendingDeltas[0].id;

    const validateResponse = await asUser(creator).post(
      `/sessions/${sessionId}/turns/${turnNumber}/deltas/${deltaId}/validate`,
    );
    expect(validateResponse.status).toBe(201);
    expect((validateResponse.body as { status: string }).status).toBe(
      'validated',
    );

    // A retry (network double-submit) must not double-apply the delta.
    const retryResponse = await asUser(creator).post(
      `/sessions/${sessionId}/turns/${turnNumber}/deltas/${deltaId}/validate`,
    );
    expect(retryResponse.status).toBe(409);
  });

  it('rejects a pending delta via POST .../deltas/:id/reject without touching the character sheet', async () => {
    const createResponse = await asUser(creator).post('/sessions').send({
      gameSystemId: ADULT_ONLY_GAME_SYSTEM_ID,
      name: 'Partie avec deltas rejetes',
      charactersVisibleToOthers: false,
    });
    const sessionId = (createResponse.body as { id: string }).id;
    await seatPlayer(
      creator,
      (createResponse.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Grognak',
    );

    await asUser(creator)
      .post(`/sessions/${sessionId}/turns`)
      .send({ actionText: 'Action' });

    const stateResponse = await asUser(creator).get(
      `/sessions/${sessionId}/state`,
    );
    const state = stateResponse.body as {
      recentTurns: { turnNumber: number; pendingDeltas: { id: string }[] }[];
    };
    const turnNumber = state.recentTurns[0].turnNumber;
    const deltaId = state.recentTurns[0].pendingDeltas[0].id;

    const rejectResponse = await asUser(creator).post(
      `/sessions/${sessionId}/turns/${turnNumber}/deltas/${deltaId}/reject`,
    );
    expect(rejectResponse.status).toBe(201);
    expect((rejectResponse.body as { status: string }).status).toBe('rejected');
  });

  it('lets the sole player delete their solo session (DELETE /sessions/:id -> 204), removing it from their list', async () => {
    const createResponse = await asUser(creator).post('/sessions').send({
      gameSystemId: ADULT_ONLY_GAME_SYSTEM_ID,
      name: 'Partie solo a supprimer',
      charactersVisibleToOthers: false,
    });
    const sessionId = (createResponse.body as { id: string }).id;
    await seatPlayer(
      creator,
      (createResponse.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Solo Perso',
    );

    const deleteResponse = await asUser(creator).delete(
      `/sessions/${sessionId}`,
    );
    expect(deleteResponse.status).toBe(204);

    const listResponse = await asUser(creator).get('/sessions');
    const ids = (listResponse.body as { id: string }[]).map((s) => s.id);
    expect(ids).not.toContain(sessionId);
  });

  it('rejects DELETE /sessions/:id when the session has 2+ active players, even from one of them (403)', async () => {
    const createResponse = await asUser(creator).post('/sessions').send({
      gameSystemId: ADULT_ONLY_GAME_SYSTEM_ID,
      name: 'Partie a deux joueurs',
      charactersVisibleToOthers: false,
    });
    const sessionId = (createResponse.body as { id: string }).id;
    const inviteCode = (createResponse.body as { inviteCode: string })
      .inviteCode;
    await seatPlayer(
      creator,
      (createResponse.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Joueur 1',
    );
    const otherPlayer: TestUser = { id: 'user-del-2p', email: 'p2@test.dev' };
    const joinResponse = await asUser(otherPlayer)
      .post('/sessions/join')
      .send({ inviteCode });
    await seatPlayer(
      otherPlayer,
      (joinResponse.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Joueur 2',
    );

    const deleteResponse = await asUser(creator).delete(
      `/sessions/${sessionId}`,
    );
    expect(deleteResponse.status).toBe(403);

    const stateResponse = await asUser(creator).get(
      `/sessions/${sessionId}/state`,
    );
    expect(stateResponse.status).toBe(200);
  });

  it('lets one player leave a 3-player session without deleting it, then the last player leaving deletes it (POST /sessions/:id/leave)', async () => {
    const createResponse = await asUser(creator).post('/sessions').send({
      gameSystemId: ADULT_ONLY_GAME_SYSTEM_ID,
      name: 'Partie a quitter',
      charactersVisibleToOthers: false,
    });
    const sessionId = (createResponse.body as { id: string }).id;
    const inviteCode = (createResponse.body as { inviteCode: string })
      .inviteCode;
    await seatPlayer(
      creator,
      (createResponse.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Joueur 1',
    );

    const playerTwo: TestUser = { id: 'user-leave-2', email: 'l2@test.dev' };
    const joinTwo = await asUser(playerTwo)
      .post('/sessions/join')
      .send({ inviteCode });
    await seatPlayer(
      playerTwo,
      (joinTwo.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Joueur 2',
    );

    // Player two leaves - session survives with the creator still seated.
    const leaveTwoResponse = await asUser(playerTwo).post(
      `/sessions/${sessionId}/leave`,
    );
    expect(leaveTwoResponse.status).toBe(201);
    expect(
      (leaveTwoResponse.body as { sessionDeleted: boolean }).sessionDeleted,
    ).toBe(false);
    const stateAfterFirstLeave = await asUser(creator).get(
      `/sessions/${sessionId}/state`,
    );
    expect(stateAfterFirstLeave.status).toBe(200);

    // The creator (now the last active player) leaves too - cascades away.
    const leaveCreatorResponse = await asUser(creator).post(
      `/sessions/${sessionId}/leave`,
    );
    expect(leaveCreatorResponse.status).toBe(201);
    expect(
      (leaveCreatorResponse.body as { sessionDeleted: boolean }).sessionDeleted,
    ).toBe(true);
    const stateAfterLastLeave = await asUser(creator).get(
      `/sessions/${sessionId}/state`,
    );
    expect(stateAfterLastLeave.status).toBe(404);
  });

  it('rejects a non-player leaving a session (403)', async () => {
    const createResponse = await asUser(creator).post('/sessions').send({
      gameSystemId: ADULT_ONLY_GAME_SYSTEM_ID,
      name: 'Partie protegee',
      charactersVisibleToOthers: false,
    });
    const sessionId = (createResponse.body as { id: string }).id;
    await seatPlayer(
      creator,
      (createResponse.body as { characterCreationSessionId: string })
        .characterCreationSessionId,
      'Joueur seul',
    );

    const intruder: TestUser = { id: 'user-intruder', email: 'i@test.dev' };
    const leaveResponse = await asUser(intruder).post(
      `/sessions/${sessionId}/leave`,
    );
    expect(leaveResponse.status).toBe(403);
  });
});
