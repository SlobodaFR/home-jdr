import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorldMap } from '../../../domain/world-map/world-map';
import { WorldMapRepository } from '../../../domain/world-map/world-map.repository';
import { WorldMapOrmEntity } from '../entities/world-map.orm-entity';

@Injectable()
export class TypeOrmWorldMapRepository extends WorldMapRepository {
  constructor(
    @InjectRepository(WorldMapOrmEntity)
    private readonly repository: Repository<WorldMapOrmEntity>,
  ) {
    super();
  }

  async findBySessionId(sessionId: string): Promise<WorldMap | null> {
    const row = await this.repository.findOne({ where: { sessionId } });
    return row ? toDomain(row) : null;
  }

  async save(worldMap: WorldMap): Promise<void> {
    await this.repository.save({
      id: worldMap.id,
      sessionId: worldMap.sessionId,
      imageStorageKey: worldMap.imageStorageKey,
      generationPrompt: worldMap.generationPrompt,
      createdAt: worldMap.createdAt,
    });
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.repository.delete({ sessionId });
  }
}

function toDomain(row: WorldMapOrmEntity): WorldMap {
  return WorldMap.create({
    id: row.id,
    sessionId: row.sessionId,
    imageStorageKey: row.imageStorageKey,
    generationPrompt: row.generationPrompt,
    createdAt: row.createdAt,
  });
}
