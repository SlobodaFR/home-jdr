import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ButtonDanger } from './ButtonDanger';

describe('ButtonDanger', () => {
  it('renders its label and applies the danger tokens', () => {
    render(<ButtonDanger>Quitter la partie</ButtonDanger>);

    const button = screen.getByRole('button', { name: 'Quitter la partie' });
    expect(button.className).toContain('text-danger');
    expect(button.className).toContain('border-danger');
  });
});
