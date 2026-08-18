import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CharacterCreationSession } from '../../domain/character-creation/character-creation-session';
import { CharacterCreationSessionRepository } from '../../domain/character-creation/character-creation-session.repository';
import { CharacterCreationSessionOrmEntity } from '../persistence/entities/character-creation-session.orm-entity';

@Injectable()
export class TypeOrmCharacterCreationSessionRepository extends CharacterCreationSessionRepository {
  constructor(
    @InjectRepository(CharacterCreationSessionOrmEntity)
    private readonly repository: Repository<CharacterCreationSessionOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<CharacterCreationSession | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByGameSessionAndUser(
    gameSessionId: string,
    userId: string,
  ): Promise<CharacterCreationSession | null> {
    const row = await this.repository.findOne({
      where: { gameSessionId, userId },
    });
    return row ? toDomain(row) : null;
  }

  async save(session: CharacterCreationSession): Promise<void> {
    await this.repository.save({
      id: session.id,
      gameSessionId: session.gameSessionId,
      gameSystemId: session.gameSystemId,
      userId: session.userId,
      status: session.status,
      messages: session.messages,
      draftCharacter: session.draftCharacter,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  }

  async deleteByGameSessionId(gameSessionId: string): Promise<void> {
    await this.repository.delete({ gameSessionId });
  }
}

function toDomain(
  row: CharacterCreationSessionOrmEntity,
): CharacterCreationSession {
  return CharacterCreationSession.create({
    id: row.id,
    gameSessionId: row.gameSessionId,
    gameSystemId: row.gameSystemId,
    userId: row.userId,
    status: row.status,
    messages: row.messages,
    draftCharacter: row.draftCharacter,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
