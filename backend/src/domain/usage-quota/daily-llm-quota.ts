/** `AppSetting.key` under which the admin-editable daily LLM quota is stored. */
export const DAILY_LLM_QUOTA_SETTING_KEY = 'daily-llm-quota';

/** Env var read as a fallback when no `AppSetting` row exists yet - see `.env.example`. */
export const DAILY_LLM_QUOTA_ENV_KEY = 'DAILY_LLM_QUOTA';

/** Last-resort fallback when neither the admin setting nor the env var is configured. */
export const DEFAULT_DAILY_LLM_QUOTA = 50;

/**
 * Resolves the effective daily quota: `AppSetting` (admin, takes effect
 * immediately - no redeploy) wins over the `DAILY_LLM_QUOTA` env var, which
 * wins over a hardcoded default. Pure function (no framework/IO
 * dependency - `ConfigService`/`AppSettingRepository` reads happen at the
 * call site, in application/infrastructure) so it is trivially unit
 * testable and shared between `TypeOrmUsageQuotaAdapter` and
 * `GetUsageStatsUseCase`.
 */
export function resolveDailyQuotaValue(
  settingValue: string | null | undefined,
  envValue: string | number | undefined,
): number {
  const parsedSetting =
    settingValue !== null && settingValue !== undefined
      ? Number(settingValue)
      : NaN;
  if (Number.isFinite(parsedSetting) && parsedSetting > 0) {
    return parsedSetting;
  }

  const parsedEnv = envValue !== undefined ? Number(envValue) : NaN;
  if (Number.isFinite(parsedEnv) && parsedEnv > 0) {
    return parsedEnv;
  }

  return DEFAULT_DAILY_LLM_QUOTA;
}

/** Midnight (local time) of the day `date` falls on - the quota's reset boundary. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** `date` shifted by `days` (may be negative), preserving time-of-day. */
export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Stable per-day grouping key (local calendar day), e.g. for the 7-day trend. */
export function toDateKey(date: Date): string {
  const day = startOfDay(date);
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(day.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}
