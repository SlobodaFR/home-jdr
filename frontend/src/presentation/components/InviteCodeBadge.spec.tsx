import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InviteCodeBadge } from './InviteCodeBadge';

describe('InviteCodeBadge', () => {
  it('renders the invite code in a mono chip', () => {
    render(<InviteCodeBadge code="XK4R2P" />);
    const badge = screen.getByText('XK4R2P');
    expect(badge.className).toContain('font-mono-ui');
    expect(badge.className).toContain('rounded-full');
  });
});
