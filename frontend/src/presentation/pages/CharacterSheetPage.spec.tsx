import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { characterApiClient } from '../../infrastructure/character-api-client';
import { CharacterSheetPage } from './CharacterSheetPage';

vi.mock('../../infrastructure/character-api-client', () => ({
  characterApiClient: { getById: vi.fn() },
}));

function renderPage(id = 'char-1') {
  return render(
    <MemoryRouter initialEntries={[`/characters/${id}`]}>
      <Routes>
        <Route path="/characters/:id" element={<CharacterSheetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CharacterSheetPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading state then the character sheet', async () => {
    vi.mocked(characterApiClient.getById).mockResolvedValue({
      id: 'char-1',
      gameSystemId: 'gs-1',
      sessionId: 'session-1',
      ownerUserId: 'user-1',
      name: 'Aragorn',
      hitPointsMax: 20,
      hitPointsCurrent: 20,
      inventory: [],
      customAttributes: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    renderPage();

    expect(screen.getByText('Chargement...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Aragorn')).toBeInTheDocument();
    });
  });

  it('shows an error message when the fetch fails', async () => {
    vi.mocked(characterApiClient.getById).mockRejectedValue(new Error('boom'));

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('Impossible de charger la fiche personnage.'),
      ).toBeInTheDocument();
    });
  });
});
