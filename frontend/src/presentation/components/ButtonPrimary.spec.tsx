import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ButtonPrimary } from './ButtonPrimary';

afterEach(cleanup);

describe('ButtonPrimary', () => {
  it('renders as a button and forwards clicks', () => {
    const onClick = vi.fn();
    render(<ButtonPrimary onClick={onClick}>Valider</ButtonPrimary>);

    const button = screen.getByRole('button', { name: 'Valider' });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders as a link when href is provided', () => {
    render(<ButtonPrimary href="/api/auth/login">Se connecter</ButtonPrimary>);

    const link = screen.getByRole('link', { name: 'Se connecter' });
    expect(link.getAttribute('href')).toBe('/api/auth/login');
  });
});
