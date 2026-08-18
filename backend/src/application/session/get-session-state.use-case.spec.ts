import { GameSession } from '../../domain/session/game-session';
import { SessionPlayer } from '../../domain/session/session-player';
import { TurnResolution } from '../../domain/session/turn-resolution';
import { TurnSubmission } from '../../domain/session/turn-submission';
import { GetSessionStateUseCase } from './get-session-state.use-case';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from './in-memory-session-player.repository';
import { InMemoryTurnResolutionRepository } from './in-memory-turn-resolution.repository';
import { InMemoryTurnSubmissionRepository } from './in-memory-turn-submission.repository';

function buildSession() {
  return GameSession.create({
    gameSystemId: 'game-system-1',
    name: 'La quete du dragon',
    inviteCode: 'XK4R2P',
    createdByUserId: 'user-1',
  });
}

describe('GetSessionStateUseCase', () => {
  it('reports which players have submitted for the current turn', async () => {
    const session = buildSession();
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      SessionPlayer.create({
        sessionId: session.id,
        userId: 'user-1',
        characterId: 'char-1',
      }),
      SessionPlayer.create({
        sessionId: session.id,
        userId: 'user-2',
        characterId: 'char-2',
      }),
    ]);
    const turnSubmissionRepository = new InMemoryTurnSubmissionRepository([
      TurnSubmission.create({
        sessionId: session.id,
        turnNumber: 1,
        playerId: 'user-1',
        actionText: 'Action',
      }),
    ]);
    const useCase = new GetSessionStateUseCase(
      new InMemoryGameSessionRepository([session]),
      sessionPlayerRepository,
      turnSubmissionRepository,
      new InMemoryTurnResolutionRepository(),
    );

    const state = await useCase.execute(session.id);

    expect(state.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-1',
          hasSubmittedCurrentTurn: true,
        }),
        expect.objectContaining({
          userId: 'user-2',
          hasSubmittedCurrentTurn: false,
        }),
      ]),
    );
  });

  it('returns only the N most recent resolutions, never the full history', async () => {
    const session = buildSession();
    const resolutions = Array.from({ length: 200 }, (_, index) =>
      TurnResolution.create({
        sessionId: session.id,
        turnNumber: index + 1,
        narrationText: `Narration du tour ${index + 1}`,
      }),
    );
    const turnResolutionRepository = new InMemoryTurnResolutionRepository(
      resolutions,
    );
    const useCase = new GetSessionStateUseCase(
      new InMemoryGameSessionRepository([session]),
      new InMemorySessionPlayerRepository(),
      new InMemoryTurnSubmissionRepository(),
      turnResolutionRepository,
    );

    const state = await useCase.execute(session.id, 5);

    expect(state.recentResolutions).toHaveLength(5);
    expect(state.recentResolutions.map((r) => r.turnNumber)).toEqual([
      200, 199, 198, 197, 196,
    ]);
  });

  it('runs in constant time regardless of turn-history size: the repository is asked for at most `limit` rows', async () => {
    const session = buildSession();
    const resolutions = Array.from({ length: 5000 }, (_, index) =>
      TurnResolution.create({
        sessionId: session.id,
        turnNumber: index + 1,
        narrationText: `Narration ${index + 1}`,
      }),
    );
    const turnResolutionRepository = new InMemoryTurnResolutionRepository(
      resolutions,
    );
    const findRecentSpy = jest.spyOn(
      turnResolutionRepository,
      'findRecentBySessionId',
    );
    const useCase = new GetSessionStateUseCase(
      new InMemoryGameSessionRepository([session]),
      new InMemorySessionPlayerRepository(),
      new InMemoryTurnSubmissionRepository(),
      turnResolutionRepository,
    );

    const state = await useCase.execute(session.id, 5);

    expect(findRecentSpy).toHaveBeenCalledWith(session.id, 5);
    expect(state.recentResolutions.length).toBeLessThanOrEqual(5);
  });

  it('throws when the session does not exist', async () => {
    const useCase = new GetSessionStateUseCase(
      new InMemoryGameSessionRepository(),
      new InMemorySessionPlayerRepository(),
      new InMemoryTurnSubmissionRepository(),
      new InMemoryTurnResolutionRepository(),
    );

    await expect(useCase.execute('unknown')).rejects.toThrow();
  });
});
