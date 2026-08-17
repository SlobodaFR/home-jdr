import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ButtonSecondary } from './ButtonSecondary';

describe('ButtonSecondary', () => {
  it('renders its label and applies the ink text / hairline border tokens', () => {
    render(<ButtonSecondary>Annuler</ButtonSecondary>);

    const button = screen.getByRole('button', { name: 'Annuler' });
    expect(button.className).toContain('text-ink');
    expect(button.className).toContain('border-hairline');
  });
});
