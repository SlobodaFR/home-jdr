export interface DailyUsage {
  /** `YYYY-MM-DD` (local calendar day). */
  date: string;
  totalCalls: number;
}

export interface UsageStats {
  dailyQuota: number;
  /** `scene_resolution` calls today - what the backend quota gate counts against. */
  usedToday: number;
  /** `usedToday / dailyQuota`, clamped to [0, 100] - feeds `QuotaMeter`. */
  usedPercent: number;
  /** All call types combined, today. */
  totalCallsToday: number;
  /** Oldest to newest, 7 entries. */
  trend: DailyUsage[];
}
