import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClockPort } from '../../domain/shared/clock.port';
import { AppSettingRepository } from '../../domain/usage-quota/app-setting.repository';
import {
  DAILY_LLM_QUOTA_ENV_KEY,
  DAILY_LLM_QUOTA_SETTING_KEY,
  resolveDailyQuotaValue,
  startOfDay,
} from '../../domain/usage-quota/daily-llm-quota';
import { LlmUsageRecord } from '../../domain/usage-quota/llm-usage-record';
import { LlmUsageRecordRepository } from '../../domain/usage-quota/llm-usage-record.repository';
import {
  RecordLlmUsageInput,
  UsageQuotaPort,
} from '../../domain/usage-quota/usage-quota.port';

/**
 * `UsageQuotaPort` implementation. Named `TypeOrm...` per
 * `tasks/08-admin-quotas-cost-guardrails.md`, but composes the
 * `LlmUsageRecordRepository`/`AppSettingRepository` ports rather than
 * talking to TypeORM directly - the actual TypeORM plumbing lives behind
 * those repositories' concrete implementations.
 */
@Injectable()
export class TypeOrmUsageQuotaAdapter extends UsageQuotaPort {
  constructor(
    private readonly llmUsageRecordRepository: LlmUsageRecordRepository,
    private readonly appSettingRepository: AppSettingRepository,
    private readonly clock: ClockPort,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async checkQuotaAvailable(): Promise<boolean> {
    const now = this.clock.now();
    const [todaysRecords, setting] = await Promise.all([
      this.llmUsageRecordRepository.findSince(startOfDay(now)),
      this.appSettingRepository.findByKey(DAILY_LLM_QUOTA_SETTING_KEY),
    ]);

    const usedToday = todaysRecords.filter(
      (record) => record.callType === 'scene_resolution',
    ).length;
    const quota = resolveDailyQuotaValue(
      setting?.value,
      this.config.get<string>(DAILY_LLM_QUOTA_ENV_KEY),
    );

    return usedToday < quota;
  }

  async recordUsage(input: RecordLlmUsageInput): Promise<void> {
    const record = LlmUsageRecord.create({
      sessionId: input.sessionId,
      turnNumber: input.turnNumber,
      provider: input.provider,
      callType: input.callType,
      occurredAt: this.clock.now(),
    });
    await this.llmUsageRecordRepository.save(record);
  }
}
