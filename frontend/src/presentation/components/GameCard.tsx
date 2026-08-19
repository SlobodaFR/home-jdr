import { ReactNode } from 'react';
import { cx } from './utils/cx';

// DESIGN.md > Components > game-card
// bg canvas / rounded.md / elevation level 2 (the ONLY other user of
// shadow-card besides DeltaProposalCard) / padding 16px (= spacing.lg).
export interface GameCardProps {
  gameName: string;
  sessionName: string;
  lastActivityLabel: string;
  statusSlot?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function GameCard({ gameName, sessionName, lastActivityLabel, statusSlot, onClick, className }: GameCardProps) {
  const interactiveProps = onClick
    ? { onClick, role: 'button' as const, tabIndex: 0 }
    : {};

  return (
    <div
      {...interactiveProps}
      className={cx(
        'block w-full h-full text-left bg-canvas rounded-md shadow-card p-lg',
        'transition-colors',
        onClick ? 'cursor-pointer hover:bg-parchment' : undefined,
        className,
      )}
    >
      <p className="font-sans-ui text-heading-md text-ink">{gameName}</p>
      <p className="font-sans-body text-body-strong text-ink mt-xxs">{sessionName}</p>
      {statusSlot ? <div className="mt-sm">{statusSlot}</div> : null}
      <p className="font-sans-body text-caption-sm text-mute mt-sm">{lastActivityLabel}</p>
    </div>
  );
}
