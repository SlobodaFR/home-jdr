import { ConfigService } from '@nestjs/config';
import { FixedClock } from '../shared/fixed-clock';
import { AppSetting } from '../../domain/usage-quota/app-setting';
import { DAILY_LLM_QUOTA_SETTING_KEY } from '../../domain/usage-quota/daily-llm-quota';
import { LlmUsageRecord } from '../../domain/usage-quota/llm-usage-record';
import { GetUsageStatsUseCase } from './get-usage-stats.use-case';
import { InMemoryAppSettingRepository } from './in-memory-app-setting.repository';
import { InMemoryLlmUsageRecordRepository } from './in-memory-llm-usage-record.repository';

function fakeConfig(values: Record<string, string> = {}): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function record(
  occurredAt: Date,
  callType: 'scene_resolution' | 'summary' = 'scene_resolution',
) {
  return LlmUsageRecord.create({
    sessionId: 'session-1',
    turnNumber: 1,
    provider: 'claude',
    callType,
    occurredAt,
  });
}

describe('GetUsageStatsUseCase', () => {
  it('reports a total consistent with the actually-recorded LlmUsageRecords for today', async () => {
    const clock = new FixedClock(new Date(2026, 2, 10, 15, 0, 0));
    const llmUsageRecordRepository = new InMemoryLlmUsageRecordRepository([
      record(new Date(2026, 2, 10, 8, 0, 0)),
      record(new Date(2026, 2, 10, 9, 0, 0), 'summary'),
      record(new Date(2026, 2, 9, 8, 0, 0)), // yesterday - excluded from today's total
    ]);
    const useCase = new GetUsageStatsUseCase(
      llmUsageRecordRepository,
      new InMemoryAppSettingRepository(),
      clock,
      fakeConfig({ DAILY_LLM_QUOTA: '10' }),
    );

    const stats = await useCase.execute();

    expect(stats.totalCallsToday).toBe(2);
    expect(stats.usedToday).toBe(1); // only scene_resolution counts against the quota
    expect(stats.dailyQuota).toBe(10);
    expect(stats.usedPercent).toBe(10);
  });

  it('returns a 7-day trend (oldest to newest), one entry per day', async () => {
    const clock = new FixedClock(new Date(2026, 2, 10, 12, 0, 0));
    const llmUsageRecordRepository = new InMemoryLlmUsageRecordRepository([
      record(new Date(2026, 2, 10, 8, 0, 0)),
      record(new Date(2026, 2, 8, 8, 0, 0)),
      record(new Date(2026, 2, 8, 9, 0, 0)),
    ]);
    const useCase = new GetUsageStatsUseCase(
      llmUsageRecordRepository,
      new InMemoryAppSettingRepository(),
      clock,
      fakeConfig({ DAILY_LLM_QUOTA: '10' }),
    );

    const stats = await useCase.execute();

    expect(stats.trend).toHaveLength(7);
    expect(stats.trend[6]).toEqual({ date: '2026-03-10', totalCalls: 1 });
    expect(stats.trend[4]).toEqual({ date: '2026-03-08', totalCalls: 2 });
    expect(stats.trend[0].date).toBe('2026-03-04');
  });

  it('reflects the admin-overridden quota immediately', async () => {
    const clock = new FixedClock(new Date(2026, 2, 10, 12, 0, 0));
    const appSettingRepository = new InMemoryAppSettingRepository([
      AppSetting.create({ key: DAILY_LLM_QUOTA_SETTING_KEY, value: '25' }),
    ]);
    const useCase = new GetUsageStatsUseCase(
      new InMemoryLlmUsageRecordRepository(),
      appSettingRepository,
      clock,
      fakeConfig({ DAILY_LLM_QUOTA: '10' }),
    );

    const stats = await useCase.execute();

    expect(stats.dailyQuota).toBe(25);
    expect(stats.usedPercent).toBe(0);
  });
});
