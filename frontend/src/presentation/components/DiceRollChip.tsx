import { cx } from './utils/cx';

// DESIGN.md > Components > dice-roll-chip
// bg ink / text accent-gold / typography.label-dice (mono) / rounded.full
// / padding 4px 12px. Always shown BEFORE the narration it resolves,
// never after (Do/Don't).
export interface DiceRollChipProps {
  label: string;
  className?: string;
}

export function DiceRollChip({ label, className }: DiceRollChipProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center bg-ink text-accent-gold font-mono-ui text-label-dice',
        'rounded-full px-md py-xs',
        className,
      )}
    >
      {label}
    </span>
  );
}
