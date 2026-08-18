import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminSessionsApiClient } from '../../infrastructure/admin-sessions-api-client';
import { AdminSessionsPage } from './AdminSessionsPage';

vi.mock('../../infrastructure/admin-sessions-api-client', () => ({
  adminSessionsApiClient: {
    fetchAll: vi.fn(),
  },
}));

describe('AdminSessionsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('lists every session with its game system name, status and participants', async () => {
    vi.mocked(adminSessionsApiClient.fetchAll).mockResolvedValue([
      {
        id: 'session-solo',
        name: 'Aventure en solo',
        gameSystemName: 'Donjons & Dragons',
        status: 'waiting_for_players',
        currentTurnNumber: 2,
        createdAt: '2026-03-10T12:00:00.000Z',
        participants: [{ userId: 'user-gm', characterName: 'Solo Hero' }],
      },
      {
        id: 'session-group',
        name: 'Enquete a Arkham',
        gameSystemName: "L'Appel de Cthulhu",
        status: 'narrating',
        currentTurnNumber: 1,
        createdAt: '2026-03-09T09:30:00.000Z',
        participants: [
          { userId: 'user-host', characterName: 'Investigateur A' },
          { userId: 'user-guest', characterName: 'Investigateur B' },
        ],
      },
    ]);

    render(
      <MemoryRouter>
        <AdminSessionsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Aventure en solo')).toBeInTheDocument();
    });
    expect(screen.getByText('Donjons & Dragons')).toBeInTheDocument();
    expect(screen.getByText('Solo Hero', { exact: false })).toBeInTheDocument();

    expect(screen.getByText('Enquete a Arkham')).toBeInTheDocument();
    expect(screen.getByText("L'Appel de Cthulhu")).toBeInTheDocument();
    expect(screen.getByText('Investigateur A', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Investigateur B', { exact: false })).toBeInTheDocument();
  });

  it('shows an empty state when there are no sessions', async () => {
    vi.mocked(adminSessionsApiClient.fetchAll).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AdminSessionsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Aucune partie pour le moment.')).toBeInTheDocument();
    });
  });

  it('surfaces the error message when the list cannot be loaded', async () => {
    vi.mocked(adminSessionsApiClient.fetchAll).mockRejectedValue(
      new Error('Admin role required'),
    );

    render(
      <MemoryRouter>
        <AdminSessionsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Admin role required')).toBeInTheDocument();
    });
  });
});
