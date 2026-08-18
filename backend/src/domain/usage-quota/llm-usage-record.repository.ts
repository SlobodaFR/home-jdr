import { LlmUsageRecord } from './llm-usage-record';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class LlmUsageRecordRepository {
  abstract save(record: LlmUsageRecord): Promise<void>;
  /**
   * Returns every record with `occurredAt >= since`. Callers (quota check,
   * admin dashboard) filter/aggregate in memory - the audit table stays
   * small (a simple frequency guard-rail, not token/dollar billing - see
   * `tasks/08-admin-quotas-cost-guardrails.md`), so this is not a
   * performance concern.
   */
  abstract findSince(since: Date): Promise<LlmUsageRecord[]>;
}
