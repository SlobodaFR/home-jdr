import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PendingCharacterDelta,
  PendingCharacterDeltaStatus,
} from '../../../domain/character/pending-character-delta';
import { PendingCharacterDeltaRepository } from '../../../domain/character/pending-character-delta.repository';
import { PendingCharacterDeltaOrmEntity } from '../entities/pending-character-delta.orm-entity';

@Injectable()
export class TypeOrmPendingCharacterDeltaRepository extends PendingCharacterDeltaRepository {
  constructor(
    @InjectRepository(PendingCharacterDeltaOrmEntity)
    private readonly repository: Repository<PendingCharacterDeltaOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<PendingCharacterDelta | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findBySessionAndTurn(
    sessionId: string,
    turnNumber: number,
  ): Promise<PendingCharacterDelta[]> {
    const rows = await this.repository.find({
      where: { sessionId, turnNumber },
    });
    return rows.map(toDomain);
  }

  async save(pendingDelta: PendingCharacterDelta): Promise<void> {
    await this.repository.save({
      id: pendingDelta.id,
      sessionId: pendingDelta.sessionId,
      turnNumber: pendingDelta.turnNumber,
      characterId: pendingDelta.characterId,
      deltaPayload: pendingDelta.deltaPayload,
      status: pendingDelta.status,
      createdAt: pendingDelta.createdAt,
    });
  }
}

function toDomain(row: PendingCharacterDeltaOrmEntity): PendingCharacterDelta {
  return PendingCharacterDelta.create({
    id: row.id,
    sessionId: row.sessionId,
    turnNumber: row.turnNumber,
    characterId: row.characterId,
    deltaPayload: row.deltaPayload,
    status: row.status as PendingCharacterDeltaStatus,
    createdAt: row.createdAt,
  });
}
