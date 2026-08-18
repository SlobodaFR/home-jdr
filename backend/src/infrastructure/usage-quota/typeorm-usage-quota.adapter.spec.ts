import { ConfigService } from '@nestjs/config';
import { InMemoryAppSettingRepository } from '../../application/usage-quota/in-memory-app-setting.repository';
import { InMemoryLlmUsageRecordRepository } from '../../application/usage-quota/in-memory-llm-usage-record.repository';
import { FixedClock } from '../../application/shared/fixed-clock';
import { AppSetting } from '../../domain/usage-quota/app-setting';
import { DAILY_LLM_QUOTA_SETTING_KEY } from '../../domain/usage-quota/daily-llm-quota';
import { LlmUsageRecord } from '../../domain/usage-quota/llm-usage-record';
import { TypeOrmUsageQuotaAdapter } from './typeorm-usage-quota.adapter';

function fakeConfig(values: Record<string, string> = {}): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function usageRecord(
  occurredAt: Date,
  overrides: Partial<{ callType: 'scene_resolution' | 'summary' }> = {},
) {
  return LlmUsageRecord.create({
    sessionId: 'session-1',
    turnNumber: 1,
    provider: 'claude',
    callType: overrides.callType ?? 'scene_resolution',
    occurredAt,
  });
}

describe('TypeOrmUsageQuotaAdapter', () => {
  it('reports quota available when today usage is below the configured quota', async () => {
    const clock = new FixedClock(new Date(2026, 2, 10, 14, 0, 0));
    const llmUsageRecordRepository = new InMemoryLlmUsageRecordRepository([
      usageRecord(new Date(2026, 2, 10, 9, 0, 0)),
    ]);
    const adapter = new TypeOrmUsageQuotaAdapter(
      llmUsageRecordRepository,
      new InMemoryAppSettingRepository(),
      clock,
      fakeConfig({ DAILY_LLM_QUOTA: '5' }),
    );

    await expect(adapter.checkQuotaAvailable()).resolves.toBe(true);
  });

  it('reports quota unavailable once today usage reaches the configured quota', async () => {
    const clock = new FixedClock(new Date(2026, 2, 10, 14, 0, 0));
    const llmUsageRecordRepository = new InMemoryLlmUsageRecordRepository([
      usageRecord(new Date(2026, 2, 10, 8, 0, 0)),
      usageRecord(new Date(2026, 2, 10, 9, 0, 0)),
    ]);
    const adapter = new TypeOrmUsageQuotaAdapter(
      llmUsageRecordRepository,
      new InMemoryAppSettingRepository(),
      clock,
      fakeConfig({ DAILY_LLM_QUOTA: '2' }),
    );

    await expect(adapter.checkQuotaAvailable()).resolves.toBe(false);
  });

  it('ignores non-scene_resolution calls when counting quota usage', async () => {
    const clock = new FixedClock(new Date(2026, 2, 10, 14, 0, 0));
    const llmUsageRecordRepository = new InMemoryLlmUsageRecordRepository([
      usageRecord(new Date(2026, 2, 10, 8, 0, 0), { callType: 'summary' }),
      usageRecord(new Date(2026, 2, 10, 9, 0, 0), { callType: 'summary' }),
    ]);
    const adapter = new TypeOrmUsageQuotaAdapter(
      llmUsageRecordRepository,
      new InMemoryAppSettingRepository(),
      clock,
      fakeConfig({ DAILY_LLM_QUOTA: '1' }),
    );

    await expect(adapter.checkQuotaAvailable()).resolves.toBe(true);
  });

  it('resets the quota at day change - yesterday usage no longer counts against today', async () => {
    const clock = new FixedClock(new Date(2026, 2, 10, 23, 0, 0));
    const llmUsageRecordRepository = new InMemoryLlmUsageRecordRepository([
      usageRecord(new Date(2026, 2, 10, 8, 0, 0)),
      usageRecord(new Date(2026, 2, 10, 9, 0, 0)),
    ]);
    const adapter = new TypeOrmUsageQuotaAdapter(
      llmUsageRecordRepository,
      new InMemoryAppSettingRepository(),
      clock,
      fakeConfig({ DAILY_LLM_QUOTA: '2' }),
    );

    await expect(adapter.checkQuotaAvailable()).resolves.toBe(false);

    // Day changes - same records, but they now fall entirely before "today".
    clock.set(new Date(2026, 2, 11, 0, 30, 0));

    await expect(adapter.checkQuotaAvailable()).resolves.toBe(true);
  });

  it('prefers the admin AppSetting quota over the env fallback, taking effect immediately', async () => {
    const clock = new FixedClock(new Date(2026, 2, 10, 14, 0, 0));
    const llmUsageRecordRepository = new InMemoryLlmUsageRecordRepository([
      usageRecord(new Date(2026, 2, 10, 9, 0, 0)),
      usageRecord(new Date(2026, 2, 10, 10, 0, 0)),
    ]);
    const appSettingRepository = new InMemoryAppSettingRepository();
    const adapter = new TypeOrmUsageQuotaAdapter(
      llmUsageRecordRepository,
      appSettingRepository,
      clock,
      fakeConfig({ DAILY_LLM_QUOTA: '1' }),
    );

    // Env fallback (1) is already exceeded by the 2 seeded calls.
    await expect(adapter.checkQuotaAvailable()).resolves.toBe(false);

    // Admin raises the quota from the admin screen - no restart, no redeploy.
    await appSettingRepository.save(
      AppSetting.create({ key: DAILY_LLM_QUOTA_SETTING_KEY, value: '10' }),
    );

    await expect(adapter.checkQuotaAvailable()).resolves.toBe(true);
  });

  it('records usage with the current clock time and the given call metadata', async () => {
    const clock = new FixedClock(new Date(2026, 2, 10, 14, 0, 0));
    const llmUsageRecordRepository = new InMemoryLlmUsageRecordRepository();
    const adapter = new TypeOrmUsageQuotaAdapter(
      llmUsageRecordRepository,
      new InMemoryAppSettingRepository(),
      clock,
      fakeConfig(),
    );

    await adapter.recordUsage({
      sessionId: 'session-1',
      turnNumber: 4,
      provider: 'claude',
      callType: 'scene_resolution',
    });

    const stored = await llmUsageRecordRepository.findSince(new Date(0));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      sessionId: 'session-1',
      turnNumber: 4,
      provider: 'claude',
      callType: 'scene_resolution',
      occurredAt: new Date(2026, 2, 10, 14, 0, 0),
    });
  });
});
