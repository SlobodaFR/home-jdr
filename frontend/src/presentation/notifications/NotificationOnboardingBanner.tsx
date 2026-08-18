import { useState } from 'react';
import { cx } from '../components/utils/cx';
import {
  Platform,
  detectPlatform,
  isStandaloneDisplayMode,
} from '../../infrastructure/push-notification-manager';

const DISMISSED_KEY = 'home-jdr:pwa-onboarding-dismissed';

export interface NotificationOnboardingBannerProps {
  /** Overridable for tests; defaults to real platform/display-mode detection. */
  platform?: Platform;
  isStandalone?: boolean;
  className?: string;
}

const INSTRUCTIONS: Record<Platform, string> = {
  ios: "Ouvre le menu de partage de Safari (icône avec une flèche vers le haut) puis choisis « Sur l'écran d'accueil ».",
  android: "Ouvre le menu (⋮) de Chrome puis choisis « Ajouter à l'écran d'accueil » ou « Installer l'application ».",
  other: 'Utilise le menu de ton navigateur pour installer ou épingler cette page.',
};

/**
 * "Ajoute cette app à ton écran d'accueil pour recevoir les notifications" -
 * see tasks/06-notifications-push.md and PRD.md (contrainte Apple: le push
 * ne fonctionne sur iOS/iPadOS que si l'app est installée). Hides itself
 * once the app already runs standalone (installed), or once dismissed
 * (persisted locally so it doesn't nag on every visit).
 */
export function NotificationOnboardingBanner({
  platform = detectPlatform(),
  isStandalone = isStandaloneDisplayMode(),
  className,
}: NotificationOnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true',
  );

  if (isStandalone || dismissed) {
    return null;
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  }

  return (
    <div
      role="status"
      className={cx(
        'flex flex-col gap-sm border border-hairline bg-parchment rounded-md px-lg py-md',
        className,
      )}
    >
      <p className="font-sans-ui text-body-strong text-ink">
        Ajoute home-jdr à ton écran d&apos;accueil pour recevoir les notifications
      </p>
      <p className="font-sans-body text-body-md text-ash">{INSTRUCTIONS[platform]}</p>
      <button
        type="button"
        onClick={dismiss}
        className="self-start font-sans-ui text-button-sm text-ink underline"
      >
        Ne plus afficher
      </button>
    </div>
  );
}
