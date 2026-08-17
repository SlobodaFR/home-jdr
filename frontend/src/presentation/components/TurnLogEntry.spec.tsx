import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TurnLogEntry } from './TurnLogEntry';
import { DiceRollChip } from './DiceRollChip';

describe('TurnLogEntry', () => {
  it('renders author, action, dice chip and narration in order', () => {
    render(
      <TurnLogEntry
        author="Alice"
        actionText="tente de crocheter la serrure"
        narration="Le mécanisme cède dans un cliquetis sec."
        diceChip={<DiceRollChip label="d20+3 = 17" />}
      />,
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('tente de crocheter la serrure')).toBeTruthy();
    expect(screen.getByText('d20+3 = 17')).toBeTruthy();
    expect(screen.getByText('Le mécanisme cède dans un cliquetis sec.')).toBeTruthy();
  });
});
