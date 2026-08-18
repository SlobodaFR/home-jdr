import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionPlayer } from '../../../domain/session/session-player';
import { SessionPlayerRepository } from '../../../domain/session/session-player.repository';
import { SessionPlayerOrmEntity } from '../entities/session-player.orm-entity';

@Injectable()
export class TypeOrmSessionPlayerRepository extends SessionPlayerRepository {
  constructor(
    @InjectRepository(SessionPlayerOrmEntity)
    private readonly repository: Repository<SessionPlayerOrmEntity>,
  ) {
    super();
  }

  async findBySessionId(sessionId: string): Promise<SessionPlayer[]> {
    const rows = await this.repository.find({ where: { sessionId } });
    return rows.map(toDomain);
  }

  async findBySessionAndUser(
    sessionId: string,
    userId: string,
  ): Promise<SessionPlayer | null> {
    const row = await this.repository.findOne({ where: { sessionId, userId } });
    return row ? toDomain(row) : null;
  }

  async save(player: SessionPlayer): Promise<void> {
    await this.repository.save({
      sessionId: player.sessionId,
      userId: player.userId,
      characterId: player.characterId,
      joinedAt: player.joinedAt,
    });
  }

  async deleteBySessionAndUser(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    await this.repository.delete({ sessionId, userId });
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.repository.delete({ sessionId });
  }
}

function toDomain(row: SessionPlayerOrmEntity): SessionPlayer {
  return SessionPlayer.create({
    sessionId: row.sessionId,
    userId: row.userId,
    characterId: row.characterId,
    joinedAt: row.joinedAt,
  });
}
