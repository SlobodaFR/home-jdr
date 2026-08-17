import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { characterApiClient } from '../../infrastructure/character-api-client';
import { CreateCharacterPage } from './CreateCharacterPage';

vi.mock('../../infrastructure/character-api-client', () => ({
  characterApiClient: { create: vi.fn() },
}));

function renderPage(initialEntry = '/characters/new?gameSystemId=gs-1&sessionId=session-1') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/characters/new" element={<CreateCharacterPage />} />
        <Route path="/characters/:id" element={<div>Fiche personnage chargée</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CreateCharacterPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a validation error when submitting without a name', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Créer mon personnage' }));

    expect(
      screen.getByText('Le nom du personnage est requis.'),
    ).toBeInTheDocument();
    expect(characterApiClient.create).not.toHaveBeenCalled();
  });

  it('submits the character and navigates to its sheet on success', async () => {
    vi.mocked(characterApiClient.create).mockResolvedValue({
      id: 'char-1',
      gameSystemId: 'gs-1',
      sessionId: 'session-1',
      ownerUserId: 'user-1',
      name: 'Aragorn',
      hitPointsMax: 20,
      hitPointsCurrent: 20,
      inventory: [],
      customAttributes: { strength: 10 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Nom du personnage'), 'Aragorn');
    await user.click(screen.getByRole('button', { name: 'Créer mon personnage' }));

    await waitFor(() => {
      expect(characterApiClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          gameSystemId: 'gs-1',
          sessionId: 'session-1',
          name: 'Aragorn',
        }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Fiche personnage chargée')).toBeInTheDocument();
    });
  });
});
