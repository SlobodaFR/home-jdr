import {
  DEFAULT_DAILY_LLM_QUOTA,
  addDays,
  resolveDailyQuotaValue,
  startOfDay,
  toDateKey,
} from './daily-llm-quota';

describe('resolveDailyQuotaValue', () => {
  it('prefers the admin AppSetting value over the env fallback', () => {
    expect(resolveDailyQuotaValue('80', '20')).toBe(80);
  });

  it('falls back to the env var when no AppSetting is stored', () => {
    expect(resolveDailyQuotaValue(undefined, '30')).toBe(30);
    expect(resolveDailyQuotaValue(null, '30')).toBe(30);
  });

  it('falls back to the hardcoded default when neither is configured', () => {
    expect(resolveDailyQuotaValue(undefined, undefined)).toBe(
      DEFAULT_DAILY_LLM_QUOTA,
    );
  });

  it('ignores a non-numeric or non-positive AppSetting value and falls back', () => {
    expect(resolveDailyQuotaValue('not-a-number', '30')).toBe(30);
    expect(resolveDailyQuotaValue('0', '30')).toBe(30);
    expect(resolveDailyQuotaValue('-5', '30')).toBe(30);
  });
});

describe('startOfDay', () => {
  it('returns midnight of the same calendar day', () => {
    const result = startOfDay(new Date(2026, 2, 10, 23, 59, 59));
    expect(result).toEqual(new Date(2026, 2, 10, 0, 0, 0, 0));
  });
});

describe('addDays', () => {
  it('shifts the date forward and backward', () => {
    const base = new Date(2026, 2, 10, 8, 0, 0);
    expect(addDays(base, 1)).toEqual(new Date(2026, 2, 11, 8, 0, 0));
    expect(addDays(base, -1)).toEqual(new Date(2026, 2, 9, 8, 0, 0));
  });
});

describe('toDateKey', () => {
  it('produces a stable per-calendar-day key regardless of time-of-day', () => {
    expect(toDateKey(new Date(2026, 2, 10, 0, 0, 1))).toBe('2026-03-10');
    expect(toDateKey(new Date(2026, 2, 10, 23, 59, 59))).toBe('2026-03-10');
  });

  it('differs across a day boundary', () => {
    expect(toDateKey(new Date(2026, 2, 10, 23, 59, 59))).not.toBe(
      toDateKey(new Date(2026, 2, 11, 0, 0, 0)),
    );
  });
});
