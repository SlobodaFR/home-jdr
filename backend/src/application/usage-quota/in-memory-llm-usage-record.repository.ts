import { LlmUsageRecord } from '../../domain/usage-quota/llm-usage-record';
import { LlmUsageRecordRepository } from '../../domain/usage-quota/llm-usage-record.repository';

/** Test double shared by use-case/adapter specs that need a `LlmUsageRecordRepository`. */
export class InMemoryLlmUsageRecordRepository extends LlmUsageRecordRepository {
  constructor(private records: LlmUsageRecord[] = []) {
    super();
  }

  save(record: LlmUsageRecord): Promise<void> {
    this.records = [
      ...this.records.filter((existing) => existing.id !== record.id),
      record,
    ];
    return Promise.resolve();
  }

  findSince(since: Date): Promise<LlmUsageRecord[]> {
    return Promise.resolve(
      this.records.filter((record) => record.occurredAt >= since),
    );
  }
}
