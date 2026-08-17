import { cx } from './utils/cx';

// DESIGN.md > Components > session-status-pill (+ variants waiting/resolving)
// rounded.full / typography.caption-sm / padding 4px 12px.
// waiting: bg hairline-soft, text ink. resolving: bg accent-gold-soft, text ink
// (transient LLM-resolution state — no insistent animation, per Do/Don't).
export type SessionStatusVariant = 'waiting' | 'resolving';

export interface SessionStatusPillProps {
  variant: SessionStatusVariant;
  label: string;
  className?: string;
}

const VARIANT_CLASSES: Record<SessionStatusVariant, string> = {
  waiting: 'bg-hairline-soft text-ink',
  resolving: 'bg-accent-gold-soft text-ink',
};

export function SessionStatusPill({ variant, label, className }: SessionStatusPillProps) {
  return (
    <span
      data-variant={variant}
      className={cx(
        'inline-flex items-center font-sans-body text-caption-sm rounded-full px-md py-xs',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
