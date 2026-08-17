import { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './utils/cx';

// DESIGN.md > Components > Boutons > button-primary
// bg ink / text on-primary / typography.button-md / padding 14px 24px / rounded.lg
// Only ONE occurrence per screen (design rule enforced by consumers, not here).
const BASE_CLASSES =
  'inline-flex items-center justify-center font-sans-ui text-button-md ' +
  'bg-ink text-on-primary rounded-lg px-xl py-3.5 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

interface CommonProps {
  children: ReactNode;
  className?: string;
}

interface AsButtonProps
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  href?: undefined;
}

interface AsLinkProps
  extends CommonProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> {
  href: string;
}

export type ButtonPrimaryProps = AsButtonProps | AsLinkProps;

export function ButtonPrimary(props: ButtonPrimaryProps) {
  const { children, className, ...rest } = props;
  const classes = cx(BASE_CLASSES, className);

  if ('href' in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as AsLinkProps;
    return (
      <a href={href} className={classes} {...anchorRest}>
        {children}
      </a>
    );
  }

  const buttonRest = rest as Omit<AsButtonProps, 'children' | 'className' | 'href'>;
  return (
    <button type="button" className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
