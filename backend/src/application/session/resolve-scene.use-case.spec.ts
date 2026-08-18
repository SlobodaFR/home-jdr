import { ConfigService } from '@nestjs/config';
import { Character } from '../../domain/character/character';
import { CharacterStateDelta } from '../../domain/character/character-state-delta';
import { GameSystem } from '../../domain/game-system/game-system';
import {
  DiceRollerPort,
  DiceRollResult,
} from '../../domain/session/dice-roller.port';
import { GameSession } from '../../domain/session/game-session';
import {
  LlmGameMasterPort,
  SceneResolutionInput,
  SceneResolutionOutput,
} from '../../domain/session/llm-game-master.port';
import { SessionPlayer } from '../../domain/session/session-player';
import { TurnResolution } from '../../domain/session/turn-resolution';
import { TurnSubmission } from '../../domain/session/turn-submission';
import { InMemoryCharacterRepository } from '../character/in-memory-character.repository';
import { InMemoryPendingCharacterDeltaRepository } from '../character/in-memory-pending-character-delta.repository';
import { InMemoryGameSystemRepository } from '../game-system/in-memory-game-system.repository';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from './in-memory-session-player.repository';
import { InMemoryTurnResolutionRepository } from './in-memory-turn-resolution.repository';
import { MaintainRollingSummaryUseCase } from './maintain-rolling-summary.use-case';
import { ResolveSceneUseCase } from './resolve-scene.use-case';

/** Deterministic stand-in for `RandomDiceRollerAdapter` - always returns the same roll. */
class FixedDiceRollerPort extends DiceRollerPort {
  public calls: string[] = [];
  roll(formula: string): DiceRollResult {
    this.calls.push(formula);
    return { formula, rolls: [14], modifier: 3, total: 17 };
  }
}

/** Records the exact input it received, and returns a narration referencing the dice fact. */
class RecordingLlmGameMasterPort extends LlmGameMasterPort {
  public lastResolveInput?: SceneResolutionInput;
  public nextOutput: SceneResolutionOutput = {
    narrationText: 'texte',
    characterDeltas: [],
  };

  resolveScene(input: SceneResolutionInput): Promise<SceneResolutionOutput> {
    this.lastResolveInput = input;
    return Promise.resolve(this.nextOutput);
  }

  summarize(): Promise<string> {
    return Promise.resolve('résumé');
  }
}

function fakeConfig(values: Record<string, number> = {}): ConfigService {
  return {
    get: (key: string, fallback?: number) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

function buildGameSystem() {
  return GameSystem.create({
    name: 'Donjons oublies',
    description: 'desc',
    adaptedForChildren: false,
    rulesText: 'Un d20 sous la stat reussit.',
    rulesSourceFileName: 'rules.pdf',
    characterSheetSchema: {
      hitPoints: { defaultMax: 30 },
      inventory: { defaultItems: [] },
      customAttributes: [],
    },
    mechanicalActions: [
      {
        actionKey: 'melee-attack',
        label: 'Attaque au corps a corps',
        diceFormula: '1d20+3',
      },
    ],
  });
}

function buildCharacter(id: string, ownerUserId: string, sessionId: string) {
  return Character.create({
    id,
    gameSystemId: 'game-system-1',
    sessionId,
    ownerUserId,
    name: `Perso ${id}`,
    hitPointsMax: 30,
    hitPointsCurrent: 30,
    inventory: [],
    customAttributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('ResolveSceneUseCase', () => {
  function buildUseCase(
    overrides: {
      gameSystem?: GameSystem;
      diceRoller?: FixedDiceRollerPort;
      llm?: RecordingLlmGameMasterPort;
      pendingRepo?: InMemoryPendingCharacterDeltaRepository;
      config?: ConfigService;
      turnResolutionRepository?: InMemoryTurnResolutionRepository;
      gameSessionRepository?: InMemoryGameSessionRepository;
      sessionPlayerRepository?: InMemorySessionPlayerRepository;
      characterRepository?: InMemoryCharacterRepository;
    } = {},
  ) {
    const gameSystem = overrides.gameSystem ?? buildGameSystem();
    const gameSystemId = gameSystem.id;
    const session = GameSession.create({
      gameSystemId,
      name: 'La quete du dragon',
      inviteCode: 'XK4R2P',
      createdByUserId: 'user-1',
    }).beginResolving();

    const character1 = buildCharacter('character-1', 'user-1', session.id);
    const character2 = buildCharacter('character-2', 'user-2', session.id);

    const gameSystemRepository = new InMemoryGameSystemRepository([gameSystem]);
    const characterRepository =
      overrides.characterRepository ??
      new InMemoryCharacterRepository([character1, character2]);
    const sessionPlayerRepository =
      overrides.sessionPlayerRepository ??
      new InMemorySessionPlayerRepository([
        SessionPlayer.create({
          sessionId: session.id,
          userId: 'user-1',
          characterId: 'character-1',
        }),
        SessionPlayer.create({
          sessionId: session.id,
          userId: 'user-2',
          characterId: 'character-2',
        }),
      ]);
    const diceRoller = overrides.diceRoller ?? new FixedDiceRollerPort();
    const llm = overrides.llm ?? new RecordingLlmGameMasterPort();
    const pendingRepo =
      overrides.pendingRepo ?? new InMemoryPendingCharacterDeltaRepository();
    const turnResolutionRepository =
      overrides.turnResolutionRepository ??
      new InMemoryTurnResolutionRepository();
    const gameSessionRepository =
      overrides.gameSessionRepository ??
      new InMemoryGameSessionRepository([session]);
    const config = overrides.config ?? fakeConfig();

    const maintainRollingSummary = new MaintainRollingSummaryUseCase(
      gameSessionRepository,
      turnResolutionRepository,
      llm,
    );

    const useCase = new ResolveSceneUseCase(
      characterRepository,
      gameSystemRepository,
      sessionPlayerRepository,
      diceRoller,
      llm,
      pendingRepo,
      turnResolutionRepository,
      maintainRollingSummary,
      config,
    );

    return {
      useCase,
      session,
      gameSystem,
      diceRoller,
      llm,
      pendingRepo,
      gameSessionRepository,
    };
  }

  it('rolls dice for the mechanical action chosen by a player, and produces a narration + pending delta', async () => {
    const { useCase, session, diceRoller, llm, pendingRepo } = buildUseCase();
    llm.nextOutput = {
      narrationText:
        'Grognak frappe fort - le jet donne 17. Le gobelin encaisse.',
      characterDeltas: [
        {
          characterId: 'character-2',
          delta: CharacterStateDelta.create({ hitPoints: -12 }),
        },
      ],
    };
    const submissions = [
      TurnSubmission.create({
        sessionId: session.id,
        turnNumber: session.currentTurnNumber,
        playerId: 'user-1',
        actionText: 'Je frappe le gobelin',
        mechanicalActionKey: 'melee-attack',
      }),
      TurnSubmission.create({
        sessionId: session.id,
        turnNumber: session.currentTurnNumber,
        playerId: 'user-2',
        actionText: 'Je recule prudemment',
      }),
    ];

    const result = await useCase.resolve(session, submissions);

    // Deterministic dice roll (RNG mocked via FixedDiceRollerPort).
    expect(diceRoller.calls).toEqual(['1d20+3']);
    expect(result.diceRolls).toEqual([
      {
        playerId: 'user-1',
        actionKey: 'melee-attack',
        actionLabel: 'Attaque au corps a corps',
        formula: '1d20+3',
        rolls: [14],
        total: 17,
      },
    ]);
    // Narration consistent with the roll.
    expect(result.narrationText).toContain('17');

    // At least one PendingCharacterDelta persisted with status "pending".
    const pending = await pendingRepo.findBySessionAndTurn(
      session.id,
      session.currentTurnNumber,
    );
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe('pending');
    expect(pending[0].characterId).toBe('character-2');
    expect(pending[0].toDelta().hitPoints).toBe(-12);

    // The dice result was injected into the LLM call as a non-negotiable fact.
    expect(llm.lastResolveInput?.diceFacts).toEqual([
      expect.objectContaining({ total: 17, formula: '1d20+3' }),
    ]);
    expect(llm.lastResolveInput?.rulesText).toBe(
      'Un d20 sous la stat reussit.',
    );
    expect(llm.lastResolveInput?.characters).toHaveLength(2);
  });

  it('does not roll any dice for a turn with only free (non-mechanical) actions', async () => {
    const { useCase, session, diceRoller, llm } = buildUseCase();
    const submissions = [
      TurnSubmission.create({
        sessionId: session.id,
        turnNumber: session.currentTurnNumber,
        playerId: 'user-1',
        actionText: 'Je discute avec le tavernier',
      }),
    ];

    const result = await useCase.resolve(session, submissions);

    expect(diceRoller.calls).toEqual([]);
    expect(result.diceRolls).toEqual([]);
    expect(llm.lastResolveInput?.diceFacts).toEqual([]);
  });

  it('ignores a stale/unknown mechanicalActionKey instead of failing the whole turn', async () => {
    const { useCase, session, diceRoller } = buildUseCase();
    const submissions = [
      TurnSubmission.create({
        sessionId: session.id,
        turnNumber: session.currentTurnNumber,
        playerId: 'user-1',
        actionText: 'Je tente un truc',
        mechanicalActionKey: 'not-a-real-action',
      }),
    ];

    const result = await useCase.resolve(session, submissions);

    expect(diceRoller.calls).toEqual([]);
    expect(result.diceRolls).toEqual([]);
  });

  it('never applies proposed deltas directly - only persists them as pending', async () => {
    const { useCase, session, llm, pendingRepo, gameSessionRepository } =
      buildUseCase();
    llm.nextOutput = {
      narrationText: 'texte',
      characterDeltas: [
        {
          characterId: 'character-2',
          delta: CharacterStateDelta.create({ hitPoints: -99 }),
        },
      ],
    };
    const submissions = [
      TurnSubmission.create({
        sessionId: session.id,
        turnNumber: session.currentTurnNumber,
        playerId: 'user-1',
        actionText: 'Action',
      }),
    ];

    await useCase.resolve(session, submissions);

    // No mutation of GameSession beyond what the caller (SubmitTurnActionUseCase) does.
    const stored = await gameSessionRepository.findById(session.id);
    expect(stored?.status).toBe(session.status);
    const pending = await pendingRepo.findBySessionAndTurn(
      session.id,
      session.currentTurnNumber,
    );
    expect(pending[0].status).toBe('pending');
  });

  it('triggers MaintainRollingSummaryUseCase every N turns (N configurable)', async () => {
    const gameSystem = buildGameSystem();
    const config = fakeConfig({ ROLLING_SUMMARY_INTERVAL: 1 });
    // Seed one prior resolution: MaintainRollingSummaryUseCase has nothing
    // to summarize (and is a no-op) when there is no turn history yet - see
    // `llm-orchestration-flow.integration.spec.ts` for the real end-to-end
    // timing (the current turn's own resolution is only persisted by
    // `SubmitTurnActionUseCase` after `resolve()` returns).
    const turnResolutionRepository = new InMemoryTurnResolutionRepository();
    const { useCase, session, llm, gameSessionRepository } = buildUseCase({
      gameSystem,
      config,
      turnResolutionRepository,
    });
    await turnResolutionRepository.save(
      TurnResolution.create({
        sessionId: session.id,
        turnNumber: 1,
        narrationText: 'Tour precedent.',
      }),
    );
    const submissions = [
      TurnSubmission.create({
        sessionId: session.id,
        turnNumber: session.currentTurnNumber,
        playerId: 'user-1',
        actionText: 'Action',
      }),
    ];

    const summarizeSpy = jest.spyOn(llm, 'summarize');

    await useCase.resolve(session, submissions);

    expect(summarizeSpy).toHaveBeenCalledTimes(1);
    const updated = await gameSessionRepository.findById(session.id);
    expect(updated?.rollingSummary).toBe('résumé');
  });

  it('does not trigger the rolling summary off-cycle', async () => {
    const config = fakeConfig({ ROLLING_SUMMARY_INTERVAL: 20 });
    const { useCase, session, llm } = buildUseCase({ config });
    const submissions = [
      TurnSubmission.create({
        sessionId: session.id,
        turnNumber: session.currentTurnNumber,
        playerId: 'user-1',
        actionText: 'Action',
      }),
    ];
    const summarizeSpy = jest.spyOn(llm, 'summarize');

    await useCase.resolve(session, submissions);

    expect(summarizeSpy).not.toHaveBeenCalled();
  });

  it('throws when the session GameSystem cannot be found', async () => {
    const gameSystemRepository = new InMemoryGameSystemRepository([]);
    const session = GameSession.create({
      gameSystemId: 'missing-game-system',
      name: 'La quete du dragon',
      inviteCode: 'XK4R2P',
      createdByUserId: 'user-1',
    });
    const llm = new RecordingLlmGameMasterPort();
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const turnResolutionRepository = new InMemoryTurnResolutionRepository();
    const useCase = new ResolveSceneUseCase(
      new InMemoryCharacterRepository(),
      gameSystemRepository,
      new InMemorySessionPlayerRepository(),
      new FixedDiceRollerPort(),
      llm,
      new InMemoryPendingCharacterDeltaRepository(),
      turnResolutionRepository,
      new MaintainRollingSummaryUseCase(
        gameSessionRepository,
        turnResolutionRepository,
        llm,
      ),
      fakeConfig(),
    );

    await expect(useCase.resolve(session, [])).rejects.toThrow();
  });
});
