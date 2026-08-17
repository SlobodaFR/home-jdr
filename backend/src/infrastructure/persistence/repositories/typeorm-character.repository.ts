import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Character } from '../../../domain/character/character';
import { CharacterRepository } from '../../../domain/character/character.repository';
import { CharacterOrmEntity } from '../entities/character.orm-entity';

@Injectable()
export class TypeOrmCharacterRepository extends CharacterRepository {
  constructor(
    @InjectRepository(CharacterOrmEntity)
    private readonly repository: Repository<CharacterOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<Character | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findBySessionId(sessionId: string): Promise<Character[]> {
    const rows = await this.repository.find({ where: { sessionId } });
    return rows.map(toDomain);
  }

  async save(character: Character): Promise<void> {
    await this.repository.save({
      id: character.id,
      gameSystemId: character.gameSystemId,
      sessionId: character.sessionId,
      ownerUserId: character.ownerUserId,
      name: character.name,
      hitPointsMax: character.hitPointsMax,
      hitPointsCurrent: character.hitPointsCurrent,
      inventory: character.inventory,
      customAttributes: character.customAttributes,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    });
  }
}

function toDomain(row: CharacterOrmEntity): Character {
  return Character.create({
    id: row.id,
    gameSystemId: row.gameSystemId,
    sessionId: row.sessionId,
    ownerUserId: row.ownerUserId,
    name: row.name,
    hitPointsMax: row.hitPointsMax,
    hitPointsCurrent: row.hitPointsCurrent,
    inventory: row.inventory,
    customAttributes: row.customAttributes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
