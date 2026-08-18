import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PendingCharacterDelta } from '../../domain/character/pending-character-delta';
import { PendingCharacterDeltaRepository } from '../../domain/character/pending-character-delta.repository';

/**
 * Marks a proposed delta as rejected. Never touches the character sheet -
 * "Ignorer" in the UI means exactly that (see `DeltaProposalCard`).
 */
@Injectable()
export class RejectCharacterDeltaUseCase {
  constructor(
    private readonly pendingCharacterDeltaRepository: PendingCharacterDeltaRepository,
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

    const rejected = pendingDelta.reject();
    await this.pendingCharacterDeltaRepository.save(rejected);
    return rejected;
  }
}
