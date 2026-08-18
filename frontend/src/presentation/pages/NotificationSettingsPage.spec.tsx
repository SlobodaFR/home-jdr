import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pushNotificationApiClient } from '../../infrastructure/push-notification-api-client';
import { pushNotificationManager } from '../../infrastructure/push-notification-manager';
import { NotificationSettingsPage } from './NotificationSettingsPage';

vi.mock('../../infrastructure/push-notification-api-client', () => ({
  pushNotificationApiClient: {
    getVapidPublicKey: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
  },
}));

vi.mock('../../infrastructure/push-notification-manager', () => ({
  pushNotificationManager: {
    isPushSupported: vi.fn(),
    getExistingSubscription: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  },
  // Also used directly by the onboarding banner rendered on this page.
  detectPlatform: () => 'other',
  isStandaloneDisplayMode: () => true,
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/settings/notifications']}>
      <Routes>
        <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
        <Route path="/" element={<div>Accueil</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NotificationSettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('tells the user push is unsupported when the browser lacks support', async () => {
    vi.mocked(pushNotificationManager.isPushSupported).mockReturnValue(false);
    renderPage();

    expect(
      await screen.findByText(/pas prises en charge par ce navigateur/),
    ).toBeInTheDocument();
  });

  it('offers to enable notifications when supported but not yet subscribed', async () => {
    vi.mocked(pushNotificationManager.isPushSupported).mockReturnValue(true);
    vi.mocked(pushNotificationManager.getExistingSubscription).mockResolvedValue(null);

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Activer les notifications' }),
    ).toBeInTheDocument();
  });

  it('subscribes, registers with the backend, and shows the disable option once enabled', async () => {
    vi.mocked(pushNotificationManager.isPushSupported).mockReturnValue(true);
    vi.mocked(pushNotificationManager.getExistingSubscription).mockResolvedValue(null);
    vi.mocked(pushNotificationApiClient.getVapidPublicKey).mockResolvedValue('vapid-public-key');
    vi.mocked(pushNotificationManager.subscribe).mockResolvedValue({
      endpoint: 'https://push.example.com/subscription/abc',
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
    });
    vi.mocked(pushNotificationApiClient.register).mockResolvedValue({
      id: 'subscription-1',
      endpoint: 'https://push.example.com/subscription/abc',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Activer les notifications' }));

    await waitFor(() => {
      expect(pushNotificationApiClient.register).toHaveBeenCalledWith(
        'https://push.example.com/subscription/abc',
        { p256dh: 'p256dh-value', auth: 'auth-value' },
      );
    });
    expect(
      await screen.findByRole('button', { name: 'Désactiver les notifications' }),
    ).toBeInTheDocument();
    expect(localStorage.getItem('home-jdr:push-subscription-id')).toBe('subscription-1');
  });

  it('unsubscribes and unregisters with the backend when disabling', async () => {
    localStorage.setItem('home-jdr:push-subscription-id', 'subscription-1');
    vi.mocked(pushNotificationManager.isPushSupported).mockReturnValue(true);
    vi.mocked(pushNotificationManager.getExistingSubscription).mockResolvedValue(
      {} as PushSubscription,
    );
    vi.mocked(pushNotificationManager.unsubscribe).mockResolvedValue(undefined);
    vi.mocked(pushNotificationApiClient.unregister).mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Désactiver les notifications' }));

    await waitFor(() => {
      expect(pushNotificationApiClient.unregister).toHaveBeenCalledWith('subscription-1');
    });
    expect(
      await screen.findByRole('button', { name: 'Activer les notifications' }),
    ).toBeInTheDocument();
    expect(localStorage.getItem('home-jdr:push-subscription-id')).toBeNull();
  });

  it('shows an error and does not register when notification permission is denied', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('denied'),
    });
    vi.mocked(pushNotificationManager.isPushSupported).mockReturnValue(true);
    vi.mocked(pushNotificationManager.getExistingSubscription).mockResolvedValue(null);

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Activer les notifications' }));

    expect(await screen.findByText(/permission de notification a été refusée/)).toBeInTheDocument();
    expect(pushNotificationApiClient.register).not.toHaveBeenCalled();
  });
});
