import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TurnSubmission } from '../../../domain/session/turn-submission';
import { TurnSubmissionRepository } from '../../../domain/session/turn-submission.repository';
import { TurnSubmissionOrmEntity } from '../entities/turn-submission.orm-entity';

@Injectable()
export class TypeOrmTurnSubmissionRepository extends TurnSubmissionRepository {
  constructor(
    @InjectRepository(TurnSubmissionOrmEntity)
    private readonly repository: Repository<TurnSubmissionOrmEntity>,
  ) {
    super();
  }

  async findBySessionAndTurn(
    sessionId: string,
    turnNumber: number,
  ): Promise<TurnSubmission[]> {
    const rows = await this.repository.find({
      where: { sessionId, turnNumber },
    });
    return rows.map(toDomain);
  }

  async save(submission: TurnSubmission): Promise<void> {
    await this.repository.save({
      id: submission.id,
      sessionId: submission.sessionId,
      turnNumber: submission.turnNumber,
      playerId: submission.playerId,
      actionText: submission.actionText,
      mechanicalActionKey: submission.mechanicalActionKey ?? null,
      submittedAt: submission.submittedAt,
    });
  }
}

function toDomain(row: TurnSubmissionOrmEntity): TurnSubmission {
  return TurnSubmission.create({
    id: row.id,
    sessionId: row.sessionId,
    turnNumber: row.turnNumber,
    playerId: row.playerId,
    actionText: row.actionText,
    mechanicalActionKey: row.mechanicalActionKey ?? undefined,
    submittedAt: row.submittedAt,
  });
}
