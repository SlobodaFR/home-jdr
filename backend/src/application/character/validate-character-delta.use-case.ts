import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PendingCharacterDelta } from '../../domain/character/pending-character-delta';
import { PendingCharacterDeltaRepository } from '../../domain/character/pending-character-delta.repository';
import { ApplyCharacterDeltaUseCase } from './apply-character-delta.use-case';

/**
 * The ONLY code path that turns an LLM-proposed delta into an actual write
 * on a character sheet - called from the UI after explicit human review
 * (see `CLAUDE.md` - "Jamais d'application automatique d'un delta d'état").
 * `ResolveSceneUseCase` never calls `ApplyCharacterDeltaUseCase` itself.
 */
@Injectable()
export class ValidateCharacterDeltaUseCase {
  constructor(
    private readonly pendingCharacterDeltaRepository: PendingCharacterDeltaRepository,
    private readonly applyCharacterDelta: ApplyCharacterDeltaUseCase,
  ) {}

  async execute(deltaId: string): Promise<PendingCharacterDelta> {
    const pendingDelta =
      await this.pendingCharacterDeltaRepository.findById(deltaId);
    if (!pendingDelta) {
      throw new NotFoundException('Pending delta not found');
    }
    if (pendingDelta.status !== 'pending') {
      throw new ConflictException(`Delta is already "${pendingDelta.status}"`);
    }

    await this.applyCharacterDelta.execute(
      pendingDelta.characterId,
      pendingDelta.toDelta(),
    );

    const validated = pendingDelta.validate();
    await this.pendingCharacterDeltaRepository.save(validated);
    return validated;
  }
}
