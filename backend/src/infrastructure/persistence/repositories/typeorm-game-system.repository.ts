import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSystem } from '../../../domain/game-system/game-system';
import {
  GameSystemListFilter,
  GameSystemRepository,
} from '../../../domain/game-system/game-system.repository';
import { GameSystemOrmEntity } from '../entities/game-system.orm-entity';

@Injectable()
export class TypeOrmGameSystemRepository extends GameSystemRepository {
  constructor(
    @InjectRepository(GameSystemOrmEntity)
    private readonly repository: Repository<GameSystemOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<GameSystem | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findAll(filter?: GameSystemListFilter): Promise<GameSystem[]> {
    const rows = await this.repository.find({
      where: filter?.childSafeOnly ? { adaptedForChildren: true } : {},
      order: { createdAt: 'DESC' },
    });
    return rows.map(toDomain);
  }

  async save(gameSystem: GameSystem): Promise<void> {
    await this.repository.save({
      id: gameSystem.id,
      name: gameSystem.name,
      description: gameSystem.description,
      adaptedForChildren: gameSystem.adaptedForChildren,
      rulesText: gameSystem.rulesText,
      rulesSourceFileName: gameSystem.rulesSourceFileName,
      characterSheetSchema: gameSystem.characterSheetSchema,
      mechanicalActions: gameSystem.mechanicalActions,
      createdAt: gameSystem.createdAt,
    });
  }
}

function toDomain(row: GameSystemOrmEntity): GameSystem {
  return GameSystem.create({
    id: row.id,
    name: row.name,
    description: row.description,
    adaptedForChildren: row.adaptedForChildren,
    rulesText: row.rulesText,
    rulesSourceFileName: row.rulesSourceFileName,
    characterSheetSchema: row.characterSheetSchema,
    mechanicalActions: row.mechanicalActions,
    createdAt: row.createdAt,
  });
}
