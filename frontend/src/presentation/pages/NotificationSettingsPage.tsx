import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pushNotificationApiClient } from '../../infrastructure/push-notification-api-client';
import { pushNotificationManager } from '../../infrastructure/push-notification-manager';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { ButtonSecondary } from '../components/ButtonSecondary';
import { NotificationOnboardingBanner } from '../notifications/NotificationOnboardingBanner';

const SUBSCRIPTION_ID_KEY = 'home-jdr:push-subscription-id';

type Status = 'loading' | 'unsupported' | 'enabled' | 'disabled';

/**
 * "Écran de gestion des notifications (activer/désactiver, visible dans les
 * paramètres du compte)" - see tasks/06-notifications-push.md. No dedicated
 * account/settings shell exists yet in this repo, so this ships as its own
 * route (`/settings/notifications`, linked from HomePage) rather than
 * inventing one.
 */
export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pushNotificationManager.isPushSupported()) {
      setStatus('unsupported');
      return;
    }
    pushNotificationManager
      .getExistingSubscription()
      .then((subscription) => setStatus(subscription ? 'enabled' : 'disabled'))
      .catch(() => setStatus('disabled'));
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      if (Notification.permission === 'denied') {
        setError('Les notifications sont bloquées pour ce site dans ton navigateur.');
        return;
      }
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setError('La permission de notification a été refusée.');
          return;
        }
      }

      const vapidPublicKey = await pushNotificationApiClient.getVapidPublicKey();
      if (!vapidPublicKey) {
        setError(
          "Les notifications push ne sont pas configurées côté serveur pour le moment.",
        );
        return;
      }

      const { endpoint, keys } = await pushNotificationManager.subscribe(vapidPublicKey);
      const subscription = await pushNotificationApiClient.register(endpoint, keys);
      localStorage.setItem(SUBSCRIPTION_ID_KEY, subscription.id);
      setStatus('enabled');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'activer les notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const subscriptionId = localStorage.getItem(SUBSCRIPTION_ID_KEY);
      await pushNotificationManager.unsubscribe();
      if (subscriptionId) {
        await pushNotificationApiClient.unregister(subscriptionId);
        localStorage.removeItem(SUBSCRIPTION_ID_KEY);
      }
      setStatus('disabled');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossible de désactiver les notifications.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-lg py-section flex flex-col gap-xl">
      <h1 className="font-sans-ui text-heading-xl text-ink">Notifications</h1>

      <NotificationOnboardingBanner />

      {status === 'loading' && <p className="font-sans-body text-body-md text-mute">Chargement...</p>}

      {status === 'unsupported' && (
        <p className="font-sans-body text-body-md text-ash">
          Les notifications push ne sont pas prises en charge par ce navigateur.
        </p>
      )}

      {(status === 'enabled' || status === 'disabled') && (
        <div className="flex flex-col gap-md max-w-sm">
          <p className="font-sans-body text-body-md text-ash">
            {status === 'enabled'
              ? "Tu recevras une notification quand c'est ton tour de jouer, ou quand une scène vient d'être résolue."
              : "Active les notifications pour être prévenu quand c'est ton tour de jouer."}
          </p>
          {status === 'enabled' ? (
            <ButtonSecondary onClick={() => void disable()} disabled={busy}>
              Désactiver les notifications
            </ButtonSecondary>
          ) : (
            <ButtonPrimary onClick={() => void enable()} disabled={busy}>
              Activer les notifications
            </ButtonPrimary>
          )}
        </div>
      )}

      {error && <p className="font-sans-body text-body-md text-danger">{error}</p>}

      <ButtonSecondary onClick={() => navigate('/')}>Retour</ButtonSecondary>
    </main>
  );
}
