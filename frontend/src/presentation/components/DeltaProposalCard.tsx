import { ButtonPrimary } from './ButtonPrimary';
import { ButtonDanger } from './ButtonDanger';
import { cx } from './utils/cx';

// DESIGN.md > Components > delta-proposal-card
// bg canvas / border 1px accent-gold / elevation level 2 / rounded.md.
// Pure display + callbacks — no delta-resolution business logic here
// (CLAUDE.md: a proposed delta must transit through explicit human
// validation before writing to state; that gate lives in the use-case,
// not in this component). Never auto-dismisses.
export interface DeltaProposalItem {
  label: string;
  value: string;
}

export interface DeltaProposalCardProps {
  title?: string;
  deltas: DeltaProposalItem[];
  onValidate: () => void;
  onReject: () => void;
  validateLabel?: string;
  rejectLabel?: string;
  className?: string;
}

export function DeltaProposalCard({
  title = 'Proposition du MJ',
  deltas,
  onValidate,
  onReject,
  validateLabel = 'Valider',
  rejectLabel = 'Ignorer',
  className,
}: DeltaProposalCardProps) {
  return (
    <div
      className={cx(
        'bg-canvas border border-accent-gold rounded-md shadow-card p-lg',
        className,
      )}
    >
      <p className="font-sans-ui text-heading-md text-ink">{title}</p>
      <ul className="mt-sm flex flex-col gap-xxs">
        {deltas.map((delta, index) => (
          <li
            key={`${delta.label}-${index}`}
            className="flex items-center justify-between font-sans-body text-body-md text-ink"
          >
            <span>{delta.label}</span>
            <span className="font-sans-body text-body-strong">{delta.value}</span>
          </li>
        ))}
      </ul>
      <div className="mt-lg flex gap-sm">
        <ButtonPrimary onClick={onValidate}>{validateLabel}</ButtonPrimary>
        <ButtonDanger onClick={onReject}>{rejectLabel}</ButtonDanger>
      </div>
    </div>
  );
}
