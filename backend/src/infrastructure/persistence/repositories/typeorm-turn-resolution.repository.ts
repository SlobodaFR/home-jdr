import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TurnResolution } from '../../../domain/session/turn-resolution';
import { TurnResolutionRepository } from '../../../domain/session/turn-resolution.repository';
import { TurnResolutionOrmEntity } from '../entities/turn-resolution.orm-entity';

@Injectable()
export class TypeOrmTurnResolutionRepository extends TurnResolutionRepository {
  constructor(
    @InjectRepository(TurnResolutionOrmEntity)
    private readonly repository: Repository<TurnResolutionOrmEntity>,
  ) {
    super();
  }

  async findRecentBySessionId(
    sessionId: string,
    limit: number,
  ): Promise<TurnResolution[]> {
    // ORDER BY + LIMIT at the SQL level - never loads the full history (see
    // the port's contract: GET /api/sessions/:id/state must run in constant
    // time regardless of turn count).
    const rows = await this.repository.find({
      where: { sessionId },
      order: { turnNumber: 'DESC' },
      take: limit,
    });
    return rows.map(toDomain);
  }

  async save(resolution: TurnResolution): Promise<void> {
    await this.repository.save({
      id: resolution.id,
      sessionId: resolution.sessionId,
      turnNumber: resolution.turnNumber,
      narrationText: resolution.narrationText,
      resolvedAt: resolution.resolvedAt,
    });
  }
}

function toDomain(row: TurnResolutionOrmEntity): TurnResolution {
  return TurnResolution.create({
    id: row.id,
    sessionId: row.sessionId,
    turnNumber: row.turnNumber,
    narrationText: row.narrationText,
    resolvedAt: row.resolvedAt,
  });
}
