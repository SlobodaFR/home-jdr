import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

const navItems = [
  { key: 'games', label: 'Mes parties', to: '/', icon: <span>G</span> },
  { key: 'map', label: 'Carte', to: '/map', icon: <span>M</span> },
];

describe('AppShell', () => {
  it('renders nav items in both the mobile bottom nav and the desktop sidebar, plus children', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell navItems={navItems}>
          <p>Contenu de la page</p>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.getByText('Contenu de la page')).toBeTruthy();
    // Present twice: once in the sidebar nav, once in the bottom nav.
    expect(screen.getAllByRole('link', { name: 'Mes parties' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Carte' })).toHaveLength(2);
  });
});
