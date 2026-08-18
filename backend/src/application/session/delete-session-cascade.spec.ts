import { CharacterCreationSession } from '../../domain/character-creation/character-creation-session';
import { Character } from '../../domain/character/character';
import { PendingCharacterDelta } from '../../domain/character/pending-character-delta';
import { GameSession } from '../../domain/session/game-session';
import { SessionPlayer } from '../../domain/session/session-player';
import { TurnResolution } from '../../domain/session/turn-resolution';
import { TurnSubmission } from '../../domain/session/turn-submission';
import { LlmUsageRecord } from '../../domain/usage-quota/llm-usage-record';
import { MapPin } from '../../domain/world-map/map-pin';
import { WorldMap } from '../../domain/world-map/world-map';
import { InMemoryCharacterCreationSessionRepository } from '../character-creation/in-memory-character-creation-session.repository';
import { InMemoryCharacterRepository } from '../character/in-memory-character.repository';
import { InMemoryPendingCharacterDeltaRepository } from '../character/in-memory-pending-character-delta.repository';
import { InMemoryLlmUsageRecordRepository } from '../usage-quota/in-memory-llm-usage-record.repository';
import { InMemoryMapPinRepository } from '../world-map/in-memory-map-pin.repository';
import { InMemoryWorldMapRepository } from '../world-map/in-memory-world-map.repository';
import { DeleteSessionCascade } from './delete-session-cascade';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from './in-memory-session-player.repository';
import { InMemoryTurnResolutionRepository } from './in-memory-turn-resolution.repository';
import { InMemoryTurnSubmissionRepository } from './in-memory-turn-submission.repository';

function buildSession(id: string) {
  return GameSession.create({
    id,
    gameSystemId: 'game-system-1',
    name: `Partie ${id}`,
    inviteCode: `CODE-${id}`,
    createdByUserId: 'user-1',
  });
}

function buildCharacter(id: string, sessionId: string) {
  return Character.create({
    id,
    gameSystemId: 'game-system-1',
    sessionId,
    ownerUserId: 'user-1',
    name: `Perso ${id}`,
    hitPointsMax: 20,
    hitPointsCurrent: 20,
    inventory: [],
    customAttributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('DeleteSessionCascade', () => {
  it('removes every row scoped to the deleted session, leaves the other session untouched, and never touches LlmUsageRecords', async () => {
    const targetSessionId = 'session-target';
    const otherSessionId = 'session-other';

    const gameSessionRepository = new InMemoryGameSessionRepository([
      buildSession(targetSessionId),
      buildSession(otherSessionId),
    ]);

    const targetPlayer = SessionPlayer.create({
      sessionId: targetSessionId,
      userId: 'user-1',
      characterId: 'character-target',
    });
    const otherPlayer = SessionPlayer.create({
      sessionId: otherSessionId,
      userId: 'user-2',
      characterId: 'character-other',
    });
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      targetPlayer,
      otherPlayer,
    ]);

    const characterRepository = new InMemoryCharacterRepository([
      buildCharacter('character-target', targetSessionId),
      buildCharacter('character-other', otherSessionId),
    ]);

    const turnSubmissionRepository = new InMemoryTurnSubmissionRepository([
      TurnSubmission.create({
        sessionId: targetSessionId,
        turnNumber: 1,
        playerId: 'user-1',
        actionText: 'Il fonce',
      }),
      TurnSubmission.create({
        sessionId: otherSessionId,
        turnNumber: 1,
        playerId: 'user-2',
        actionText: 'Il attend',
      }),
    ]);

    const turnResolutionRepository = new InMemoryTurnResolutionRepository([
      TurnResolution.create({
        sessionId: targetSessionId,
        turnNumber: 1,
        narrationText: 'Il fonce dans le mur.',
      }),
      TurnResolution.create({
        sessionId: otherSessionId,
        turnNumber: 1,
        narrationText: 'Il attend patiemment.',
      }),
    ]);

    const pendingCharacterDeltaRepository =
      new InMemoryPendingCharacterDeltaRepository([
        PendingCharacterDelta.create({
          sessionId: targetSessionId,
          turnNumber: 1,
          characterId: 'character-target',
          deltaPayload: { hitPoints: -5 },
        }),
        PendingCharacterDelta.create({
          sessionId: otherSessionId,
          turnNumber: 1,
          characterId: 'character-other',
          deltaPayload: { hitPoints: -2 },
        }),
      ]);

    const targetWorldMap = WorldMap.create({
      sessionId: targetSessionId,
      imageStorageKey: 'maps/target.png',
      generationPrompt: 'Une foret',
    });
    const otherWorldMap = WorldMap.create({
      sessionId: otherSessionId,
      imageStorageKey: 'maps/other.png',
      generationPrompt: 'Un donjon',
    });
    const worldMapRepository = new InMemoryWorldMapRepository([
      targetWorldMap,
      otherWorldMap,
    ]);

    const targetPin = MapPin.create({
      worldMapId: targetWorldMap.id,
      label: 'Le village',
      positionX: 0.2,
      positionY: 0.3,
      createdByUserId: 'user-1',
    });
    const otherPin = MapPin.create({
      worldMapId: otherWorldMap.id,
      label: 'La grotte',
      positionX: 0.4,
      positionY: 0.5,
      createdByUserId: 'user-2',
    });
    const mapPinRepository = new InMemoryMapPinRepository([
      targetPin,
      otherPin,
    ]);

    const inProgressCreationSession = CharacterCreationSession.create({
      gameSessionId: targetSessionId,
      gameSystemId: 'game-system-1',
      userId: 'user-3',
    });
    const otherCreationSession = CharacterCreationSession.create({
      gameSessionId: otherSessionId,
      gameSystemId: 'game-system-1',
      userId: 'user-2',
    });
    const characterCreationSessionRepository =
      new InMemoryCharacterCreationSessionRepository([
        inProgressCreationSession,
        otherCreationSession,
      ]);

    // Deliberately NOT injected into the cascade - proves architecturally
    // that billing history can never be touched by this code path (see
    // CLAUDE.md - never delete LlmUsageRecords on session deletion).
    const llmUsageRecordRepository = new InMemoryLlmUsageRecordRepository([
      LlmUsageRecord.create({
        sessionId: targetSessionId,
        turnNumber: 1,
        provider: 'claude',
        callType: 'scene_resolution',
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ]);

    const cascade = new DeleteSessionCascade(
      gameSessionRepository,
      sessionPlayerRepository,
      characterRepository,
      turnSubmissionRepository,
      turnResolutionRepository,
      pendingCharacterDeltaRepository,
      worldMapRepository,
      mapPinRepository,
      characterCreationSessionRepository,
    );

    await cascade.execute(targetSessionId);

    // Target session: everything scoped to it is gone.
    await expect(
      gameSessionRepository.findById(targetSessionId),
    ).resolves.toBeNull();
    await expect(
      sessionPlayerRepository.findBySessionId(targetSessionId),
    ).resolves.toEqual([]);
    await expect(
      characterRepository.findBySessionId(targetSessionId),
    ).resolves.toEqual([]);
    await expect(
      turnSubmissionRepository.findBySessionAndTurn(targetSessionId, 1),
    ).resolves.toEqual([]);
    await expect(
      turnResolutionRepository.findRecentBySessionId(targetSessionId, 10),
    ).resolves.toEqual([]);
    await expect(
      pendingCharacterDeltaRepository.findBySessionAndTurn(targetSessionId, 1),
    ).resolves.toEqual([]);
    await expect(
      worldMapRepository.findBySessionId(targetSessionId),
    ).resolves.toBeNull();
    await expect(
      mapPinRepository.findByWorldMapId(targetWorldMap.id),
    ).resolves.toEqual([]);
    await expect(
      characterCreationSessionRepository.findById(inProgressCreationSession.id),
    ).resolves.toBeNull();

    // Other session: everything is fully intact.
    await expect(
      gameSessionRepository.findById(otherSessionId),
    ).resolves.not.toBeNull();
    await expect(
      sessionPlayerRepository.findBySessionId(otherSessionId),
    ).resolves.toEqual([otherPlayer]);
    await expect(
      characterRepository.findBySessionId(otherSessionId),
    ).resolves.toHaveLength(1);
    await expect(
      turnSubmissionRepository.findBySessionAndTurn(otherSessionId, 1),
    ).resolves.toHaveLength(1);
    await expect(
      turnResolutionRepository.findRecentBySessionId(otherSessionId, 10),
    ).resolves.toHaveLength(1);
    await expect(
      pendingCharacterDeltaRepository.findBySessionAndTurn(otherSessionId, 1),
    ).resolves.toHaveLength(1);
    await expect(
      worldMapRepository.findBySessionId(otherSessionId),
    ).resolves.not.toBeNull();
    await expect(
      mapPinRepository.findByWorldMapId(otherWorldMap.id),
    ).resolves.toEqual([otherPin]);
    await expect(
      characterCreationSessionRepository.findById(otherCreationSession.id),
    ).resolves.not.toBeNull();

    // Billing history survives untouched - the cascade never had a handle
    // on this repository at all.
    await expect(
      llmUsageRecordRepository.findSince(new Date(0)),
    ).resolves.toHaveLength(1);
  });

  it('is a no-op on the world map cascade when the session never had one', async () => {
    const sessionId = 'session-no-map';
    const gameSessionRepository = new InMemoryGameSessionRepository([
      buildSession(sessionId),
    ]);
    const worldMapRepository = new InMemoryWorldMapRepository();
    const mapPinRepository = new InMemoryMapPinRepository();

    const cascade = new DeleteSessionCascade(
      gameSessionRepository,
      new InMemorySessionPlayerRepository(),
      new InMemoryCharacterRepository(),
      new InMemoryTurnSubmissionRepository(),
      new InMemoryTurnResolutionRepository(),
      new InMemoryPendingCharacterDeltaRepository(),
      worldMapRepository,
      mapPinRepository,
      new InMemoryCharacterCreationSessionRepository(),
    );

    await expect(cascade.execute(sessionId)).resolves.toBeUndefined();
    await expect(gameSessionRepository.findById(sessionId)).resolves.toBeNull();
  });
});
