import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './utils/cx';

// DESIGN.md > Components > Boutons > button-icon-circular
// bg parchment / icon ink / rounded.full / size 40px, tap area extended to
// 48px via invisible padding (Responsive Behavior > Cibles tactiles).
// 40px/48px aren't in the custom spacing scale (DESIGN.md's spacing table
// stops at section=48px as a section gap, not a size token) — they map
// exactly onto Tailwind's built-in numeric scale (w-10/h-10 = 40px,
// w-12/h-12 = 48px), which still goes through Tailwind config rather than
// an arbitrary literal value.
export interface IconCircularButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  icon: ReactNode;
  ariaLabel: string;
  className?: string;
}

export function IconCircularButton({ icon, ariaLabel, className, ...rest }: IconCircularButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cx('inline-flex h-12 w-12 items-center justify-center rounded-full', className)}
      {...rest}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-parchment text-ink">
        {icon}
      </span>
    </button>
  );
}
