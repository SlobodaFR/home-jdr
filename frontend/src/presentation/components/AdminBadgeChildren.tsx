import { cx } from './utils/cx';

// DESIGN.md > Components > admin-badge-children
// bg success / text on-primary / typography.caption-sm / rounded.sm.
// Admin-catalog only — never shown to players (access filter, not game
// info), so this component is purely presentational; visibility gating
// is the caller's responsibility.
export interface AdminBadgeChildrenProps {
  label?: string;
  className?: string;
}

export function AdminBadgeChildren({ label = 'Adapté enfants', className }: AdminBadgeChildrenProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center bg-success text-on-primary font-sans-body text-caption-sm',
        'rounded-sm px-sm py-xxs',
        className,
      )}
    >
      {label}
    </span>
  );
}
