import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './utils/cx';

// DESIGN.md > Components > Boutons > button-danger
// bg canvas / text danger / border 1px danger / typography.button-md / rounded.lg
export interface ButtonDangerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children: ReactNode;
  className?: string;
}

export function ButtonDanger({ children, className, ...rest }: ButtonDangerProps) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center font-sans-ui text-button-md',
        'bg-canvas text-danger border border-danger rounded-lg px-xl py-3.5',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
