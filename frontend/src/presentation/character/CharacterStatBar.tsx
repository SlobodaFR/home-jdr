/** Default critical threshold: below or at 25% of max, see tasks/02-character-sheet.md. */
const DEFAULT_CRITICAL_THRESHOLD = 0.25;

export interface CharacterStatBarProps {
  label: string;
  current: number;
  max: number;
  /** Reused as-is in compact form by the session-engine screen (03-session-engine). */
  compact?: boolean;
  criticalThreshold?: number;
}

/**
 * `{component.character-stat-bar}` / `{component.character-stat-bar-critical}`
 * from DESIGN.md. Below `criticalThreshold` of max, switches to the
 * `accent-blood` treatment — the only place that color is allowed to appear.
 */
export function CharacterStatBar({
  label,
  current,
  max,
  compact = false,
  criticalThreshold = DEFAULT_CRITICAL_THRESHOLD,
}: CharacterStatBarProps) {
  const safeMax = Math.max(max, 1);
  const ratio = Math.min(Math.max(current / safeMax, 0), 1);
  const isCritical = current / safeMax <= criticalThreshold;

  return (
    <div data-testid="character-stat-bar" data-critical={isCritical} className="w-full">
      <div className="flex items-center justify-between mb-xxs">
        <span
          className={`font-body-strong ${compact ? 'text-caption-md' : ''} ${
            isCritical ? 'text-accent-blood' : 'text-ink'
          }`}
        >
          {label}
        </span>
        <span
          className={`font-caption-sm ${isCritical ? 'text-accent-blood' : 'text-mute'}`}
        >
          {current} / {max}
        </span>
      </div>
      <div
        className={`w-full bg-hairline-soft rounded-full overflow-hidden ${
          compact ? 'h-1' : 'h-2'
        }`}
      >
        <div
          className={`h-full rounded-full ${isCritical ? 'bg-accent-blood' : 'bg-success'}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
