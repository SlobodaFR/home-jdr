import {
  RecordLlmUsageInput,
  UsageQuotaPort,
} from '../../domain/usage-quota/usage-quota.port';

/**
 * Test double shared by `ResolveSceneUseCase`/`MaintainRollingSummaryUseCase`
 * specs. Defaults to "quota available" and records every `recordUsage()`
 * call so tests can assert what was billed (and, just as importantly, what
 * was NOT billed - see the "no LLM call consumed when quota exhausted"
 * acceptance criterion).
 */
export class InMemoryUsageQuotaPort extends UsageQuotaPort {
  public available = true;
  public recorded: RecordLlmUsageInput[] = [];

  checkQuotaAvailable(): Promise<boolean> {
    return Promise.resolve(this.available);
  }

  recordUsage(record: RecordLlmUsageInput): Promise<void> {
    this.recorded.push(record);
    return Promise.resolve();
  }
}
