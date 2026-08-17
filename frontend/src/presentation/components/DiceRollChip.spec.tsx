import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiceRollChip } from './DiceRollChip';

describe('DiceRollChip', () => {
  it('renders the roll result in the ink/gold mono chip', () => {
    render(<DiceRollChip label="d20+3 = 17" />);
    const chip = screen.getByText('d20+3 = 17');
    expect(chip.className).toContain('bg-ink');
    expect(chip.className).toContain('text-accent-gold');
  });
});
