import { cx } from './utils/cx';

// DESIGN.md > Components > character-stat-bar / character-stat-bar-critical
// Track: bg hairline-soft. Fill: success by default, accent-blood when
// critical — accent-blood's ONLY authorized use in the whole system.
export interface CharacterStatBarProps {
  label: string;
  current: number;
  max: number;
  isCritical?: boolean;
  className?: string;
}

export function CharacterStatBar({ label, current, max, isCritical = false, className }: CharacterStatBarProps) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.min(Math.max(current / safeMax, 0), 1);
  const percent = Math.round(ratio * 100);

  return (
    <div className={cx('w-full', className)} data-critical={isCritical}>
      <div className="flex items-baseline justify-between mb-xxs">
        <span
          className={cx(
            'font-sans-body text-body-strong',
            isCritical ? 'text-accent-blood' : 'text-ink',
          )}
        >
          {label}
        </span>
        <span className="font-sans-body text-caption-sm text-mute">
          {current}/{max}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2 w-full rounded-sm bg-hairline-soft overflow-hidden"
      >
        <div
          className={cx('h-full rounded-sm', isCritical ? 'bg-accent-blood' : 'bg-success')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
