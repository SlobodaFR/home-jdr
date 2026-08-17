import { cx } from './utils/cx';

// DESIGN.md > Components > quota-meter
// Thin 4px bar, bg hairline-soft, fill info under 80% usage, danger beyond
// — admin-only, monitors daily LLM call quota.
const DANGER_THRESHOLD_PERCENT = 80;

export interface QuotaMeterProps {
  usedPercent: number;
  label?: string;
  className?: string;
}

export function QuotaMeter({ usedPercent, label, className }: QuotaMeterProps) {
  const clamped = Math.min(Math.max(usedPercent, 0), 100);
  const isOverThreshold = clamped >= DANGER_THRESHOLD_PERCENT;

  return (
    <div className={cx('w-full', className)}>
      <div
        role="progressbar"
        aria-label={label ?? 'Quota utilisé'}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1 w-full rounded-sm bg-hairline-soft overflow-hidden"
      >
        <div
          className={cx('h-full rounded-sm', isOverThreshold ? 'bg-danger' : 'bg-info')}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label ? <p className="font-sans-body text-utility-xs text-mute mt-xxs">{label}</p> : null}
    </div>
  );
}
