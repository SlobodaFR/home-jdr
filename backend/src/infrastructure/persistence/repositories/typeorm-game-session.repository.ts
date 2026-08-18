import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  GameSession,
  SessionStatus,
} from '../../../domain/session/game-session';
import { GameSessionRepository } from '../../../domain/session/game-session.repository';
import { GameSessionOrmEntity } from '../entities/game-session.orm-entity';
import { SessionPlayerOrmEntity } from '../entities/session-player.orm-entity';

@Injectable()
export class TypeOrmGameSessionRepository extends GameSessionRepository {
  constructor(
    @InjectRepository(GameSessionOrmEntity)
    private readonly repository: Repository<GameSessionOrmEntity>,
    @InjectRepository(SessionPlayerOrmEntity)
    private readonly playerRepository: Repository<SessionPlayerOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<GameSession | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByInviteCode(inviteCode: string): Promise<GameSession | null> {
    const row = await this.repository.findOne({ where: { inviteCode } });
    return row ? toDomain(row) : null;
  }

  async findForUser(userId: string): Promise<GameSession[]> {
    const [ownRows, playerRows] = await Promise.all([
      this.repository.find({ where: { createdByUserId: userId } }),
      this.playerRepository.find({ where: { userId } }),
    ]);

    const memberSessionIds = playerRows.map((row) => row.sessionId);
    const memberRows = memberSessionIds.length
      ? await this.repository.find({ where: { id: In(memberSessionIds) } })
      : [];

    const byId = new Map<string, GameSessionOrmEntity>();
    for (const row of [...ownRows, ...memberRows]) {
      byId.set(row.id, row);
    }

    return Array.from(byId.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toDomain);
  }

  async save(session: GameSession): Promise<void> {
    await this.repository.save({
      id: session.id,
      gameSystemId: session.gameSystemId,
      name: session.name,
      inviteCode: session.inviteCode,
      status: session.status,
      currentTurnNumber: session.currentTurnNumber,
      rollingSummary: session.rollingSummary,
      createdByUserId: session.createdByUserId,
      createdAt: session.createdAt,
    });
  }
}

function toDomain(row: GameSessionOrmEntity): GameSession {
  return GameSession.create({
    id: row.id,
    gameSystemId: row.gameSystemId,
    name: row.name,
    inviteCode: row.inviteCode,
    status: row.status as SessionStatus,
    currentTurnNumber: row.currentTurnNumber,
    rollingSummary: row.rollingSummary,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
  });
}
