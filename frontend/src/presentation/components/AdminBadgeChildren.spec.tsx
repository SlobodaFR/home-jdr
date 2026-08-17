import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AdminBadgeChildren } from './AdminBadgeChildren';

afterEach(cleanup);

describe('AdminBadgeChildren', () => {
  it('renders the default label with success tokens', () => {
    render(<AdminBadgeChildren />);
    const badge = screen.getByText('Adapté enfants');
    expect(badge.className).toContain('bg-success');
    expect(badge.className).toContain('text-on-primary');
  });

  it('accepts a custom label', () => {
    render(<AdminBadgeChildren label="Enfants OK" />);
    expect(screen.getByText('Enfants OK')).toBeTruthy();
  });
});
