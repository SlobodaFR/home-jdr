import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './utils/cx';

// DESIGN.md > Components > Boutons > button-secondary
// bg canvas / border 1px hairline / text ink / typography.button-md / rounded.lg
export interface ButtonSecondaryProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children: ReactNode;
  className?: string;
}

export function ButtonSecondary({ children, className, ...rest }: ButtonSecondaryProps) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center font-sans-ui text-button-md',
        'bg-canvas text-ink border border-hairline rounded-lg px-xl py-3.5',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
