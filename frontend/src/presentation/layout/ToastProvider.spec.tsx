import { render, screen, act, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from './ToastProvider';

afterEach(cleanup);

function TriggerButton({ message }: { message: string }) {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast(message, 'danger')}>
      Déclencher
    </button>
  );
}

describe('ToastProvider', () => {
  it('renders a toast pushed via useToast', () => {
    render(
      <ToastProvider>
        <TriggerButton message="Erreur réseau" />
      </ToastProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Déclencher' }).click();
    });

    expect(screen.getByRole('status').textContent).toBe('Erreur réseau');
  });

  it('throws when useToast is used outside a provider', () => {
    function Broken() {
      useToast();
      return null;
    }
    expect(() => render(<Broken />)).toThrow();
  });
});
