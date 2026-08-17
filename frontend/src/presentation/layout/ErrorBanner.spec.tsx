import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBanner } from './ErrorBanner';

afterEach(cleanup);

describe('ErrorBanner', () => {
  it('renders the message and role=alert', () => {
    render(<ErrorBanner message="Connexion perdue avec le serveur" />);
    expect(screen.getByRole('alert').textContent).toContain('Connexion perdue avec le serveur');
  });

  it('calls onDismiss when the close button is clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorBanner message="Connexion perdue" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
