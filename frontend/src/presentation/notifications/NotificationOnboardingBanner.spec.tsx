import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NotificationOnboardingBanner } from './NotificationOnboardingBanner';

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
});

describe('NotificationOnboardingBanner', () => {
  it('renders nothing when the app already runs standalone (installed)', () => {
    render(<NotificationOnboardingBanner platform="ios" isStandalone={true} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows iOS-specific instructions on iOS', () => {
    render(<NotificationOnboardingBanner platform="ios" isStandalone={false} />);

    expect(screen.getByRole('status').textContent).toContain('Safari');
  });

  it('shows Android-specific instructions on Android', () => {
    render(<NotificationOnboardingBanner platform="android" isStandalone={false} />);

    expect(screen.getByRole('status').textContent).toContain('Chrome');
  });

  it('hides itself and remembers the dismissal once "Ne plus afficher" is clicked', () => {
    const { unmount } = render(
      <NotificationOnboardingBanner platform="android" isStandalone={false} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ne plus afficher' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    unmount();
    render(<NotificationOnboardingBanner platform="android" isStandalone={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
