import { TextareaHTMLAttributes } from 'react';
import { cx } from './utils/cx';

// DESIGN.md > Components > Formulaires > action-input / action-input-focused
// Default: bg canvas, border 1px hairline, rounded.sm, typography.body-md.
// Focus: border 2px ink, no decorative glow.
export interface ActionInputProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  className?: string;
}

export function ActionInput({ className, rows = 3, ...rest }: ActionInputProps) {
  return (
    <textarea
      rows={rows}
      className={cx(
        'w-full bg-canvas text-ink font-sans-body text-body-md rounded-sm',
        'border border-hairline px-md py-sm',
        'outline-none focus:border-2 focus:border-ink',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'placeholder:text-mute',
        className,
      )}
      {...rest}
    />
  );
}
