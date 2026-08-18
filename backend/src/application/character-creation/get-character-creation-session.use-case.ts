import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CharacterCreationSession } from '../../domain/character-creation/character-creation-session';
import { CharacterCreationSessionRepository } from '../../domain/character-creation/character-creation-session.repository';

/** Fetches a character-creation session by id, ownership-checked - used to resume/reload the chat screen. */
@Injectable()
export class GetCharacterCreationSessionUseCase {
  constructor(
    private readonly characterCreationSessionRepository: CharacterCreationSessionRepository,
  ) {}

  async execute(
    id: string,
    requestingUserId: string,
  ): Promise<CharacterCreationSession> {
    const creationSession =
      await this.characterCreationSessionRepository.findById(id);
    if (!creationSession) {
      throw new NotFoundException('Character creation session not found');
    }
    if (creationSession.userId !== requestingUserId) {
      throw new ForbiddenException(
        'This character creation session does not belong to you',
      );
    }
    return creationSession;
  }
}
