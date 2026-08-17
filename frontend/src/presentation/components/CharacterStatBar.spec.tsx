import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CharacterStatBar } from './CharacterStatBar';

afterEach(cleanup);

describe('CharacterStatBar', () => {
  it('renders the default variant with a success fill', () => {
    render(<CharacterStatBar label="Points de vie" current={18} max={20} />);

    const bar = screen.getByRole('progressbar', { name: 'Points de vie' });
    expect(bar.getAttribute('aria-valuenow')).toBe('18');
    expect(screen.getByText('Points de vie').className).toContain('text-ink');
  });

  it('renders the critical variant using accent-blood exclusively', () => {
    render(<CharacterStatBar label="Points de vie" current={2} max={20} isCritical />);

    const label = screen.getByText('Points de vie');
    expect(label.className).toContain('text-accent-blood');
  });
});
