import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SessionStatusPill } from './SessionStatusPill';

afterEach(cleanup);

describe('SessionStatusPill', () => {
  it('renders the waiting variant with its label', () => {
    render(<SessionStatusPill variant="waiting" label="2/4 joueurs ont soumis" />);
    const pill = screen.getByText('2/4 joueurs ont soumis');
    expect(pill.className).toContain('bg-hairline-soft');
  });

  it('renders the resolving variant with its label', () => {
    render(<SessionStatusPill variant="resolving" label="Le MJ résout la scène..." />);
    const pill = screen.getByText('Le MJ résout la scène...');
    expect(pill.className).toContain('bg-accent-gold-soft');
  });
});
