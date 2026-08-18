import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameSystem } from '../../domain/game-system';
import { apiClient } from '../../infrastructure/api-client';
import { AdminGameCatalogPage } from './AdminGameCatalogPage';

vi.mock('../../infrastructure/api-client', () => ({
  apiClient: {
    fetchGameSystems: vi.fn(),
    deleteGameSystem: vi.fn(),
  },
}));

function buildGameSystem(overrides: Partial<GameSystem> = {}): GameSystem {
  return {
    id: 'game-system-1',
    name: 'Donjons & Dragons',
    description: 'JdR de fantasy',
    adaptedForChildren: false,
    rulesText: '',
    rulesSourceFileName: 'rules.pdf',
    characterSheetSchema: {
      hitPoints: { defaultMax: 20 },
      inventory: { defaultItems: [] },
      customAttributes: [],
    },
    mechanicalActions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AdminGameCatalogPage - deletion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('deletes the game system after confirmation and removes it from the list', async () => {
    vi.mocked(apiClient.fetchGameSystems).mockResolvedValue([buildGameSystem()]);
    vi.mocked(apiClient.deleteGameSystem).mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminGameCatalogPage />
      </MemoryRouter>,
    );

    const deleteButton = await screen.findByRole('button', { name: 'Supprimer' });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(apiClient.deleteGameSystem).toHaveBeenCalledWith('game-system-1');
    });
    await waitFor(() => {
      expect(screen.queryByText('Donjons & Dragons')).not.toBeInTheDocument();
    });
  });

  it('does not call the API when the confirmation is declined', async () => {
    vi.mocked(apiClient.fetchGameSystems).mockResolvedValue([buildGameSystem()]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminGameCatalogPage />
      </MemoryRouter>,
    );

    const deleteButton = await screen.findByRole('button', { name: 'Supprimer' });
    await user.click(deleteButton);

    expect(apiClient.deleteGameSystem).not.toHaveBeenCalled();
    expect(screen.getByText('Donjons & Dragons')).toBeInTheDocument();
  });

  it('surfaces the backend error message verbatim when deletion is blocked', async () => {
    vi.mocked(apiClient.fetchGameSystems).mockResolvedValue([buildGameSystem()]);
    vi.mocked(apiClient.deleteGameSystem).mockRejectedValue(
      new Error('Ce JdR est utilisé par au moins une partie et ne peut pas être supprimé.'),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminGameCatalogPage />
      </MemoryRouter>,
    );

    const deleteButton = await screen.findByRole('button', { name: 'Supprimer' });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(
        screen.getByText('Ce JdR est utilisé par au moins une partie et ne peut pas être supprimé.'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Donjons & Dragons')).toBeInTheDocument();
  });
});
