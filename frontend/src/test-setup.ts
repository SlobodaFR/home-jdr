import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom 25 + Node's own (unflagged, storage-less) `localStorage` global
// leave `window.localStorage` undefined in this test environment - unlike
// a real browser, where it is always available. Polyfilled here (once, for
// every test file) rather than per-spec, since any component may start
// relying on it (see NotificationOnboardingBanner/NotificationSettingsPage,
// tasks/06-notifications-push.md).
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage) {
  class InMemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length(): number {
      return this.store.size;
    }

    clear(): void {
      this.store.clear();
    }

    getItem(key: string): string | null {
      return this.store.has(key) ? this.store.get(key)! : null;
    }

    key(index: number): string | null {
      return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string): void {
      this.store.delete(key);
    }

    setItem(key: string, value: string): void {
      this.store.set(key, String(value));
    }
  }

  Object.defineProperty(globalThis, 'localStorage', {
    value: new InMemoryStorage(),
    configurable: true,
    writable: true,
  });
}
