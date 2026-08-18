/**
 * Registers the PWA service worker (`public/service-worker.js`) -
 * installability + Web Push `push`/`notificationclick` handling, see
 * `tasks/06-notifications-push.md`. No-ops in browsers/environments
 * without `serviceWorker` support (older Safari, test/jsdom environments).
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // Best-effort: a failed registration should not block the app -
      // notifications simply stay unavailable (surfaced by
      // NotificationSettingsPage, not here).
    });
  });
}
