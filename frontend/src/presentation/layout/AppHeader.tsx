import { useAuth } from '../auth/AuthProvider';
import { IconCircularButton } from '../components/IconCircularButton';

/**
 * Shared AppShell `header` slot: app identity + signed-in user + logout.
 * Rendered once (top of the desktop sidebar, top bar on mobile) instead of
 * every page re-implementing its own "Se déconnecter" button.
 */
export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <div className="flex w-full items-center justify-between gap-md">
      <span className="font-sans-ui text-heading-md text-ink">home-jdr</span>
      <div className="flex items-center gap-sm">
        {user && (
          <span className="hidden desktop:inline font-sans-body text-caption-sm text-mute truncate max-w-32">
            {user.name}
          </span>
        )}
        <IconCircularButton
          ariaLabel="Se déconnecter"
          onClick={() => void logout()}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 17.5H4.5A1.5 1.5 0 0 1 3 16V4a1.5 1.5 0 0 1 1.5-1.5H8" />
              <path d="M13.5 14 17.5 10 13.5 6" />
              <path d="M17.5 10H7.5" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
