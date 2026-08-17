import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeltaProposalCard } from './DeltaProposalCard';

describe('DeltaProposalCard', () => {
  it('renders the proposed deltas and triggers the validate/reject callbacks', () => {
    const onValidate = vi.fn();
    const onReject = vi.fn();

    render(
      <DeltaProposalCard
        deltas={[
          { label: 'Points de vie', value: '-12' },
          { label: 'Inventaire', value: '+ Épée rouillée' },
        ]}
        onValidate={onValidate}
        onReject={onReject}
      />,
    );

    expect(screen.getByText('Points de vie')).toBeTruthy();
    expect(screen.getByText('+ Épée rouillée')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ignorer' }));

    expect(onValidate).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});
