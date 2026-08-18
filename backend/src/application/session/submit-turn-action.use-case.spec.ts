import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameSession } from '../../domain/session/game-session';
import {
  SceneResolverPort,
  TurnResolutionResult,
} from '../../domain/session/scene-resolver.port';
import { SessionPlayer } from '../../domain/session/session-player';
import { TurnResolvedEvent } from '../../domain/session/turn-resolved.event';
import { TurnSubmission } from '../../domain/session/turn-submission';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from './in-memory-session-player.repository';
import { InMemoryTurnResolutionRepository } from './in-memory-turn-resolution.repository';
import { InMemoryTurnSubmissionRepository } from './in-memory-turn-submission.repository';
import { SubmitTurnActionUseCase } from './submit-turn-action.use-case';

/** Records every resolve() call so tests can assert it fires exactly once per turn. */
class RecordingSceneResolver extends SceneResolverPort {
  public calls: { turnNumber: number; submissionCount: number }[] = [];

  resolve(
    session: GameSession,
    submissions: TurnSubmission[],
  ): Promise<TurnResolutionResult> {
    this.calls.push({
      turnNumber: session.currentTurnNumber,
      submissionCount: submissions.length,
    });
    return Promise.resolve({
      narrationText: submissions
        .map((s) => `${s.playerId}: ${s.actionText}`)
        .join('\n'),
    });
  }
}

function buildSession() {
  return GameSession.create({
    gameSystemId: 'game-system-1',
    name: 'La quete du dragon',
    inviteCode: 'XK4R2P',
    createdByUserId: 'user-1',
  });
}

function buildPlayer(userId: string, sessionId: string) {
  return SessionPlayer.create({
    sessionId,
    userId,
    characterId: `character-${userId}`,
  });
}

describe('SubmitTurnActionUseCase', () => {
  it('resolves immediately for a solo (1-player) session', async () => {
    const session = buildSession();
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      buildPlayer('user-1', session.id),
    ]);
    const turnSubmissionRepository = new InMemoryTurnSubmissionRepository();
    const turnResolutionRepository = new InMemoryTurnResolutionRepository();
    const sceneResolver = new RecordingSceneResolver();
    const useCase = new SubmitTurnActionUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      turnSubmissionRepository,
      turnResolutionRepository,
      sceneResolver,
      new EventEmitter2(),
    );

    const result = await useCase.execute({
      sessionId: session.id,
      userId: 'user-1',
      actionText: "J'ouvre la porte",
    });

    expect(sceneResolver.calls).toHaveLength(1);
    expect(result.resolution).not.toBeNull();
    expect(result.session.status).toBe('narrating');
  });

  it('waits for every player of a 3-player session before resolving', async () => {
    const session = buildSession();
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      buildPlayer('user-1', session.id),
      buildPlayer('user-2', session.id),
      buildPlayer('user-3', session.id),
    ]);
    const turnSubmissionRepository = new InMemoryTurnSubmissionRepository();
    const turnResolutionRepository = new InMemoryTurnResolutionRepository();
    const sceneResolver = new RecordingSceneResolver();
    const useCase = new SubmitTurnActionUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      turnSubmissionRepository,
      turnResolutionRepository,
      sceneResolver,
      new EventEmitter2(),
    );

    const first = await useCase.execute({
      sessionId: session.id,
      userId: 'user-1',
      actionText: 'Action 1',
    });
    expect(first.resolution).toBeNull();
    expect(sceneResolver.calls).toHaveLength(0);
    expect((await gameSessionRepository.findById(session.id))?.status).toBe(
      'waiting_for_players',
    );

    const second = await useCase.execute({
      sessionId: session.id,
      userId: 'user-2',
      actionText: 'Action 2',
    });
    expect(second.resolution).toBeNull();
    expect(sceneResolver.calls).toHaveLength(0);

    const third = await useCase.execute({
      sessionId: session.id,
      userId: 'user-3',
      actionText: 'Action 3',
    });
    expect(third.resolution).not.toBeNull();
    expect(sceneResolver.calls).toHaveLength(1);
    expect(sceneResolver.calls[0].submissionCount).toBe(3);
    expect(third.session.status).toBe('narrating');
  });

  it('is idempotent: resubmitting for the same turn does not create a duplicate or re-trigger resolution', async () => {
    const session = buildSession();
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      buildPlayer('user-1', session.id),
      buildPlayer('user-2', session.id),
    ]);
    const turnSubmissionRepository = new InMemoryTurnSubmissionRepository();
    const turnResolutionRepository = new InMemoryTurnResolutionRepository();
    const sceneResolver = new RecordingSceneResolver();
    const useCase = new SubmitTurnActionUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      turnSubmissionRepository,
      turnResolutionRepository,
      sceneResolver,
      new EventEmitter2(),
    );

    const first = await useCase.execute({
      sessionId: session.id,
      userId: 'user-1',
      actionText: 'Action 1',
    });
    const retry = await useCase.execute({
      sessionId: session.id,
      userId: 'user-1',
      actionText: 'Action 1 bis (retry)',
    });

    expect(retry.submission.id).toBe(first.submission.id);
    expect(retry.submission.actionText).toBe('Action 1');
    const submissions = await turnSubmissionRepository.findBySessionAndTurn(
      session.id,
      1,
    );
    expect(submissions).toHaveLength(1);
    expect(sceneResolver.calls).toHaveLength(0);
  });

  it('rejects a submission from a user who is not a player of the session', async () => {
    const session = buildSession();
    const useCase = new SubmitTurnActionUseCase(
      new InMemoryGameSessionRepository([session]),
      new InMemorySessionPlayerRepository(),
      new InMemoryTurnSubmissionRepository(),
      new InMemoryTurnResolutionRepository(),
      new RecordingSceneResolver(),
      new EventEmitter2(),
    );

    await expect(
      useCase.execute({
        sessionId: session.id,
        userId: 'not-a-player',
        actionText: 'Action',
      }),
    ).rejects.toThrow();
  });

  it('rejects a submission while the session is already resolving', async () => {
    const resolvingSession = buildSession().beginResolving();
    const useCase = new SubmitTurnActionUseCase(
      new InMemoryGameSessionRepository([resolvingSession]),
      new InMemorySessionPlayerRepository([
        buildPlayer('user-1', resolvingSession.id),
      ]),
      new InMemoryTurnSubmissionRepository(),
      new InMemoryTurnResolutionRepository(),
      new RecordingSceneResolver(),
      new EventEmitter2(),
    );

    await expect(
      useCase.execute({
        sessionId: resolvingSession.id,
        userId: 'user-1',
        actionText: 'Action',
      }),
    ).rejects.toThrow();
  });

  it('opens the next turn when a new submission arrives after narrating', async () => {
    const narratingSession = buildSession()
      .beginResolving()
      .completeResolution();
    const gameSessionRepository = new InMemoryGameSessionRepository([
      narratingSession,
    ]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      buildPlayer('user-1', narratingSession.id),
    ]);
    const turnSubmissionRepository = new InMemoryTurnSubmissionRepository();
    const turnResolutionRepository = new InMemoryTurnResolutionRepository();
    const sceneResolver = new RecordingSceneResolver();
    const useCase = new SubmitTurnActionUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      turnSubmissionRepository,
      turnResolutionRepository,
      sceneResolver,
      new EventEmitter2(),
    );

    const result = await useCase.execute({
      sessionId: narratingSession.id,
      userId: 'user-1',
      actionText: 'Nouvelle action',
    });

    expect(result.submission.turnNumber).toBe(2);
    expect(result.session.status).toBe('narrating');
    expect(sceneResolver.calls[0].turnNumber).toBe(2);
  });

  describe('TurnResolvedEvent', () => {
    it('emits a TurnResolvedEvent with every active player once the turn resolves', async () => {
      const session = buildSession();
      const gameSessionRepository = new InMemoryGameSessionRepository([
        session,
      ]);
      const sessionPlayerRepository = new InMemorySessionPlayerRepository([
        buildPlayer('user-1', session.id),
        buildPlayer('user-2', session.id),
      ]);
      const eventEmitter = new EventEmitter2();
      const emittedEvents: TurnResolvedEvent[] = [];
      eventEmitter.on('session.turn-resolved', (event: TurnResolvedEvent) =>
        emittedEvents.push(event),
      );
      const useCase = new SubmitTurnActionUseCase(
        gameSessionRepository,
        sessionPlayerRepository,
        new InMemoryTurnSubmissionRepository(),
        new InMemoryTurnResolutionRepository(),
        new RecordingSceneResolver(),
        eventEmitter,
      );

      await useCase.execute({
        sessionId: session.id,
        userId: 'user-1',
        actionText: 'Action 1',
      });
      expect(emittedEvents).toHaveLength(0);

      await useCase.execute({
        sessionId: session.id,
        userId: 'user-2',
        actionText: 'Action 2',
      });

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].sessionId).toBe(session.id);
      expect(emittedEvents[0].sessionName).toBe('La quete du dragon');
      expect(emittedEvents[0].turnNumber).toBe(1);
      expect(emittedEvents[0].playerUserIds.sort()).toEqual([
        'user-1',
        'user-2',
      ]);
    });

    it('does not emit anything for a resubmission that does not re-trigger resolution', async () => {
      const session = buildSession();
      const gameSessionRepository = new InMemoryGameSessionRepository([
        session,
      ]);
      const sessionPlayerRepository = new InMemorySessionPlayerRepository([
        buildPlayer('user-1', session.id),
        buildPlayer('user-2', session.id),
      ]);
      const eventEmitter = new EventEmitter2();
      const emittedEvents: TurnResolvedEvent[] = [];
      eventEmitter.on('session.turn-resolved', (event: TurnResolvedEvent) =>
        emittedEvents.push(event),
      );
      const useCase = new SubmitTurnActionUseCase(
        gameSessionRepository,
        sessionPlayerRepository,
        new InMemoryTurnSubmissionRepository(),
        new InMemoryTurnResolutionRepository(),
        new RecordingSceneResolver(),
        eventEmitter,
      );

      await useCase.execute({
        sessionId: session.id,
        userId: 'user-1',
        actionText: 'Action 1',
      });
      await useCase.execute({
        sessionId: session.id,
        userId: 'user-1',
        actionText: 'Action 1 bis (retry)',
      });

      expect(emittedEvents).toHaveLength(0);
    });
  });
});
