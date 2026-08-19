import { ReactNode } from 'react';
import { MarkdownText } from './MarkdownText';
import { cx } from './utils/cx';

// DESIGN.md > Components > turn-log-entry
// No card/border — continuous log stream. Structure: author -> submitted
// action -> optional dice-roll-chip -> GM narration, separated by a 1px
// hairline rule between turns.
export interface TurnLogEntryProps {
  author: string;
  actionText: string;
  narration: string;
  diceChip?: ReactNode;
  className?: string;
}

export function TurnLogEntry({ author, actionText, narration, diceChip, className }: TurnLogEntryProps) {
  return (
    <div className={cx('border-b border-hairline pb-lg', className)}>
      <p className="font-sans-body text-body-strong text-ink">{author}</p>
      <p className="font-sans-body text-body-md text-mute mt-xxs">{actionText}</p>
      {diceChip ? <div className="mt-sm">{diceChip}</div> : null}
      <MarkdownText className="font-sans-body text-body-md text-ink mt-sm">
        {narration}
      </MarkdownText>
    </div>
  );
}
