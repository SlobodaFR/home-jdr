import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClockPort } from '../../domain/shared/clock.port';
import { AppSettingRepository } from '../../domain/usage-quota/app-setting.repository';
import {
  DAILY_LLM_QUOTA_ENV_KEY,
  DAILY_LLM_QUOTA_SETTING_KEY,
  addDays,
  resolveDailyQuotaValue,
  toDateKey,
} from '../../domain/usage-quota/daily-llm-quota';
import { LlmUsageRecordRepository } from '../../domain/usage-quota/llm-usage-record.repository';

/** How many days (including today) the admin dashboard trend covers. */
export const USAGE_TREND_WINDOW_DAYS = 7;

export interface DailyUsage {
  /** `YYYY-MM-DD` (local calendar day). */
  date: string;
  totalCalls: number;
}

export interface UsageStats {
  dailyQuota: number;
  /** `scene_resolution` calls today - what `UsageQuotaPort.checkQuotaAvailable()` gates. */
  usedToday: number;
  /** `usedToday / dailyQuota`, clamped to [0, 100] - feeds `{component.quota-meter}`. */
  usedPercent: number;
  /** All call types combined, today - informational total for the admin dashboard. */
  totalCallsToday: number;
  /** Oldest to newest, `USAGE_TREND_WINDOW_DAYS` entries. */
  trend: DailyUsage[];
}

/** Admin usage dashboard - today's total + a 7-day trend (see `tasks/08-admin-quotas-cost-guardrails.md`). */
@Injectable()
export class GetUsageStatsUseCase {
  constructor(
    private readonly llmUsageRecordRepository: LlmUsageRecordRepository,
    private readonly appSettingRepository: AppSettingRepository,
    private readonly clock: ClockPort,
    private readonly config: ConfigService,
  ) {}

  async execute(): Promise<UsageStats> {
    const now = this.clock.now();
    const windowStart = addDays(now, -(USAGE_TREND_WINDOW_DAYS - 1));

    const [records, setting] = await Promise.all([
      this.llmUsageRecordRepository.findSince(windowStart),
      this.appSettingRepository.findByKey(DAILY_LLM_QUOTA_SETTING_KEY),
    ]);

    const dailyQuota = resolveDailyQuotaValue(
      setting?.value,
      this.config.get<string>(DAILY_LLM_QUOTA_ENV_KEY),
    );

    const todayKey = toDateKey(now);
    const usedToday = records.filter(
      (record) =>
        record.callType === 'scene_resolution' &&
        toDateKey(record.occurredAt) === todayKey,
    ).length;
    const totalCallsToday = records.filter(
      (record) => toDateKey(record.occurredAt) === todayKey,
    ).length;

    const trend: DailyUsage[] = [];
    for (let i = USAGE_TREND_WINDOW_DAYS - 1; i >= 0; i -= 1) {
      const key = toDateKey(addDays(now, -i));
      trend.push({
        date: key,
        totalCalls: records.filter(
          (record) => toDateKey(record.occurredAt) === key,
        ).length,
      });
    }

    const usedPercent =
      dailyQuota > 0
        ? Math.min(100, Math.round((usedToday / dailyQuota) * 100))
        : 0;

    return { dailyQuota, usedToday, usedPercent, totalCallsToday, trend };
  }
}
