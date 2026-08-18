import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import {
  LlmProvider,
  LlmUsageCallType,
  LlmUsageRecord,
} from '../../../domain/usage-quota/llm-usage-record';
import { LlmUsageRecordRepository } from '../../../domain/usage-quota/llm-usage-record.repository';
import { LlmUsageRecordOrmEntity } from '../entities/llm-usage-record.orm-entity';

@Injectable()
export class TypeOrmLlmUsageRecordRepository extends LlmUsageRecordRepository {
  constructor(
    @InjectRepository(LlmUsageRecordOrmEntity)
    private readonly repository: Repository<LlmUsageRecordOrmEntity>,
  ) {
    super();
  }

  async save(record: LlmUsageRecord): Promise<void> {
    await this.repository.save({
      id: record.id,
      sessionId: record.sessionId,
      turnNumber: record.turnNumber,
      provider: record.provider,
      callType: record.callType,
      occurredAt: record.occurredAt,
    });
  }

  async findSince(since: Date): Promise<LlmUsageRecord[]> {
    const rows = await this.repository.find({
      where: { occurredAt: MoreThanOrEqual(since) },
      order: { occurredAt: 'DESC' },
    });
    return rows.map(toDomain);
  }
}

function toDomain(row: LlmUsageRecordOrmEntity): LlmUsageRecord {
  return LlmUsageRecord.create({
    id: row.id,
    sessionId: row.sessionId,
    turnNumber: row.turnNumber,
    provider: row.provider as LlmProvider,
    callType: row.callType as LlmUsageCallType,
    occurredAt: row.occurredAt,
  });
}
