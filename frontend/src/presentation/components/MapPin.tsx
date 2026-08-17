import { cx } from './utils/cx';

// DESIGN.md > Components > map-pin / map-pin-active
// Default: 20px circle, bg ink, 2px on-primary border.
// Active: bg accent-gold, grows to 24px, no complex animation — a clean
// size/color change is enough (Do/Don't).
export interface MapPinProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MapPin({ label, active = false, onClick, className }: MapPinProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'inline-flex rounded-full border-2 border-on-primary',
        active ? 'h-6 w-6 bg-accent-gold' : 'h-5 w-5 bg-ink',
        className,
      )}
    />
  );
}
