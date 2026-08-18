import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { characterCreationApiClient } from '../../infrastructure/character-creation-api-client';
import { QuotaExceededClientError } from '../../infrastructure/session-api-client';
import { CharacterCreationChatPage } from './CharacterCreationChatPage';

vi.mock('../../infrastructure/character-creation-api-client', () => ({
  characterCreationApiClient: {
    getById: vi.fn(),
    sendMessage: vi.fn(),
    finalize: vi.fn(),
  },
}));

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockedNavigate };
});

const baseSession = {
  id: 'creation-1',
  gameSessionId: 'session-1',
  gameSystemId: 'gs-1',
  userId: 'user-1',
  status: 'in_progress' as const,
  messages: [{ role: 'assistant' as const, content: 'Bienvenue ! Parle-moi de ton personnage.' }],
  draftCharacter: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/character-creation/creation-1']}>
      <Routes>
        <Route path="/character-creation/:id" element={<CharacterCreationChatPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CharacterCreationChatPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockedNavigate.mockReset();
  });

  it('shows the opening assistant message and sends a player message', async () => {
    vi.mocked(characterCreationApiClient.getById).mockResolvedValue(baseSession);
    vi.mocked(characterCreationApiClient.sendMessage).mockResolvedValue({
      ...baseSession,
      messages: [
        ...baseSession.messages,
        { role: 'user', content: 'Un nain guerrier.' },
        { role: 'assistant', content: 'Quel est son nom ?' },
      ],
      draftCharacter: {},
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Bienvenue ! Parle-moi de ton personnage.');

    await user.type(
      screen.getByPlaceholderText('Décris ton personnage...'),
      'Un nain guerrier.',
    );
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => {
      expect(characterCreationApiClient.sendMessage).toHaveBeenCalledWith(
        'creation-1',
        'Un nain guerrier.',
      );
    });
    await screen.findByText('Quel est son nom ?');
  });

  it('shows a clear non-technical message when the daily LLM quota is exhausted (429)', async () => {
    vi.mocked(characterCreationApiClient.getById).mockResolvedValue(baseSession);
    vi.mocked(characterCreationApiClient.sendMessage).mockRejectedValue(
      new QuotaExceededClientError(),
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Bienvenue ! Parle-moi de ton personnage.');
    await user.type(screen.getByPlaceholderText('Décris ton personnage...'), 'Un nain.');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => {
      expect(
        screen.getByText('Le MJ numérique a atteint sa limite du jour, réessaie plus tard'),
      ).toBeInTheDocument();
    });
  });

  it('finalizes the draft and navigates to the session page', async () => {
    vi.mocked(characterCreationApiClient.getById).mockResolvedValue({
      ...baseSession,
      draftCharacter: { name: 'Grognak' },
    });
    vi.mocked(characterCreationApiClient.finalize).mockResolvedValue({
      character: {
        id: 'char-1',
        gameSystemId: 'gs-1',
        sessionId: 'session-1',
        ownerUserId: 'user-1',
        name: 'Grognak',
        hitPointsMax: 20,
        hitPointsCurrent: 20,
        inventory: [],
        customAttributes: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      sessionPlayer: {
        sessionId: 'session-1',
        userId: 'user-1',
        characterId: 'char-1',
        joinedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Grognak');
    await user.click(screen.getByRole('button', { name: 'Valider ma fiche' }));

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/sessions/session-1');
    });
  });

  it('disables finalizing while the draft has no name yet', async () => {
    vi.mocked(characterCreationApiClient.getById).mockResolvedValue(baseSession);

    renderPage();

    await screen.findByText('Bienvenue ! Parle-moi de ton personnage.');
    expect(screen.getByRole('button', { name: 'Valider ma fiche' })).toBeDisabled();
  });
});
