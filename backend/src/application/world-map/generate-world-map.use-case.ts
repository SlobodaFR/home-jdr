import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { ImageGenerationPort } from '../../domain/world-map/image-generation.port';
import { ObjectStoragePort } from '../../domain/world-map/object-storage.port';
import { WorldMap } from '../../domain/world-map/world-map';
import { WorldMapRepository } from '../../domain/world-map/world-map.repository';
import { assertSessionAccess } from './assert-session-access';

export interface GenerateWorldMapInput {
  sessionId: string;
  userId: string;
  /** Free-text description appended to the prompt, provided by the caller. */
  description?: string;
}

function buildPrompt(
  gameSystemName: string,
  gameSystemDescription: string,
  userDescription?: string,
): string {
  const parts = [
    `Carte du monde illustrée pour le jeu de rôle "${gameSystemName}".`,
  ];
  if (gameSystemDescription.trim()) {
    parts.push(gameSystemDescription.trim());
  }
  if (userDescription?.trim()) {
    parts.push(userDescription.trim());
  }
  return parts.join(' ');
}

/**
 * Generates (or regenerates) the world-map image of a `GameSession`: builds
 * a prompt from the `GameSystem`'s name/description, calls
 * `ImageGenerationPort`, then immediately downloads+stores the result via
 * `ObjectStoragePort` - the raw third-party generation URL is never
 * persisted (see `tasks/05-world-map.md` and `PRD.md`).
 *
 * Regenerating reuses the existing `WorldMap.id` for that session (one map
 * per session in V1) so already-placed `MapPin`s stay linked.
 */
@Injectable()
export class GenerateWorldMapUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly worldMapRepository: WorldMapRepository,
    private readonly imageGenerationPort: ImageGenerationPort,
    private readonly objectStoragePort: ObjectStoragePort,
  ) {}

  async execute(input: GenerateWorldMapInput): Promise<WorldMap> {
    const session = await assertSessionAccess(
      input.sessionId,
      input.userId,
      this.gameSessionRepository,
      this.sessionPlayerRepository,
    );

    const gameSystem = await this.gameSystemRepository.findById(
      session.gameSystemId,
    );
    if (!gameSystem) {
      throw new NotFoundException('Game system not found');
    }

    const prompt = buildPrompt(
      gameSystem.name,
      gameSystem.description,
      input.description,
    );

    const imageBuffer = await this.imageGenerationPort.generate(prompt);

    const existing = await this.worldMapRepository.findBySessionId(
      input.sessionId,
    );
    const storageKey = `world-maps/${input.sessionId}/${randomUUID()}.png`;
    const imageStorageKey = await this.objectStoragePort.upload(
      storageKey,
      imageBuffer,
    );

    const worldMap = WorldMap.create({
      id: existing?.id,
      sessionId: input.sessionId,
      imageStorageKey,
      generationPrompt: prompt,
    });

    await this.worldMapRepository.save(worldMap);

    return worldMap;
  }
}
