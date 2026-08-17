import { cx } from './utils/cx';

// DESIGN.md > Components > invite-code-badge
// bg accent-gold-soft / text ink / typography.label-dice (mono) / rounded.full
// / padding 6px 14px — one of the few legitimate accent-gold-family usages.
export interface InviteCodeBadgeProps {
  code: string;
  className?: string;
}

export function InviteCodeBadge({ code, className }: InviteCodeBadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center bg-accent-gold-soft text-ink font-mono-ui text-label-dice',
        'rounded-full py-1.5 px-3.5',
        className,
      )}
    >
      {code}
    </span>
  );
}
