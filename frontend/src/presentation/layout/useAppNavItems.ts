import { createElement } from 'react';
import { useUserProfile } from '../user-profile/useUserProfile';
import { AppShellNavItem } from './AppShell';

// Minimal line-icon set, same stroke language as BackButton/IconCircularButton
// (no icon font, no fantasy iconography — every icon here maps to a real
// route in App.tsx, nothing invented).
function icon(d: string) {
  return createElement(
    'svg',
    { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    createElement('path', { d }),
  );
}

const HOME_ICON = icon('M3 9.5 10 3l7 6.5M5 8v8.5h10V8');
const BELL_ICON = icon('M10 2.5v1M5 8c0-2.8 2.2-5 5-5s5 2.2 5 5c0 4 1.5 5 1.5 5h-13S5 12 5 8ZM8.2 16a1.8 1.8 0 0 0 3.6 0');
const CATALOG_ICON = icon('M4 3.5h8.5A1.5 1.5 0 0 1 14 5v11.5H5.5A1.5 1.5 0 0 1 4 15V3.5ZM4 15.5V17h10');
const GAUGE_ICON = icon('M4 15a6 6 0 1 1 12 0M10 15V9.5M7 15a3 3 0 0 1 6 0');
const SESSIONS_ICON = icon('M7 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM13 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2.5 16c.4-2.6 2.2-4.5 4.5-4.5s4.1 1.9 4.5 4.5M10.5 11.7c2.1.2 3.7 2 4 4.3');

/**
 * Real, role-gated navigation — mirrors the routes actually declared in
 * App.tsx. No "Quest Log" / "Bestiary" / "World Lore" style invented
 * sections: only screens the app genuinely has.
 */
export function useAppNavItems(): AppShellNavItem[] {
  const { profile } = useUserProfile();

  const items: AppShellNavItem[] = [
    { key: 'home', label: 'Mes parties', to: '/', icon: HOME_ICON },
  ];

  if (profile?.role === 'admin') {
    items.push(
      { key: 'admin-catalogue', label: 'Catalogue JdR', to: '/admin/catalogue', icon: CATALOG_ICON },
      { key: 'admin-usage', label: 'Usage & quotas', to: '/admin/usage', icon: GAUGE_ICON },
      { key: 'admin-sessions', label: 'Parties (admin)', to: '/admin/sessions', icon: SESSIONS_ICON },
    );
  }

  items.push({ key: 'notifications', label: 'Notifications', to: '/settings/notifications', icon: BELL_ICON });

  return items;
}
