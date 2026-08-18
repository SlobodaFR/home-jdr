import { Injectable } from '@nestjs/common';
import { CharacterCreationSessionRepository } from '../../domain/character-creation/character-creation-session.repository';
import { CharacterRepository } from '../../domain/character/character.repository';
import { PendingCharacterDeltaRepository } from '../../domain/character/pending-character-delta.repository';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { TurnResolutionRepository } from '../../domain/session/turn-resolution.repository';
import { TurnSubmissionRepository } from '../../domain/session/turn-submission.repository';
import { MapPinRepository } from '../../domain/world-map/map-pin.repository';
import { WorldMapRepository } from '../../domain/world-map/world-map.repository';

/**
 * Shared by `DeleteSoloSessionUseCase` and `LeaveSessionUseCase` (its
 * last-active-player-leaves branch): permanently removes a `GameSession`
 * and everything scoped to it. Real, permanent delete - no soft-delete, no
 * undo (product decision, see the task brief).
 *
 * There are no DB-level foreign keys/cascades in this schema - every
 * relation is a plain string column (`sessionId`, `worldMapId`...) - so
 * every child table is deleted explicitly here, in this order:
 *
 *   1. `MapPin`s (looked up via the session's `WorldMap`, since pins aren't
 *      keyed by `sessionId` directly)
 *   2. Every other child row scoped by `sessionId`: `SessionPlayer`,
 *      `Character`, `TurnSubmission`, `TurnResolution`,
 *      `PendingCharacterDelta`, `WorldMap`, `CharacterCreationSession`
 *      (including ones still `in_progress`)
 *   3. The `GameSession` row itself, last
 *
 * Deliberately does NOT touch `LlmUsageRecord`s: they are a cost/audit
 * trail (see `tasks/08-admin-quotas-cost-guardrails.md`) that must survive
 * session deletion - a dangling `sessionId` reference in old usage records
 * is fine and intentional.
 */
@Injectable()
export class DeleteSessionCascade {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly turnSubmissionRepository: TurnSubmissionRepository,
    private readonly turnResolutionRepository: TurnResolutionRepository,
    private readonly pendingCharacterDeltaRepository: PendingCharacterDeltaRepository,
    private readonly worldMapRepository: WorldMapRepository,
    private readonly mapPinRepository: MapPinRepository,
    private readonly characterCreationSessionRepository: CharacterCreationSessionRepository,
  ) {}

  async execute(sessionId: string): Promise<void> {
    const worldMap = await this.worldMapRepository.findBySessionId(sessionId);
    if (worldMap) {
      await this.mapPinRepository.deleteByWorldMapId(worldMap.id);
    }

    await Promise.all([
      this.sessionPlayerRepository.deleteBySessionId(sessionId),
      this.characterRepository.deleteBySessionId(sessionId),
      this.turnSubmissionRepository.deleteBySessionId(sessionId),
      this.turnResolutionRepository.deleteBySessionId(sessionId),
      this.pendingCharacterDeltaRepository.deleteBySessionId(sessionId),
      this.worldMapRepository.deleteBySessionId(sessionId),
      this.characterCreationSessionRepository.deleteByGameSessionId(sessionId),
    ]);

    await this.gameSessionRepository.deleteById(sessionId);
  }
}
