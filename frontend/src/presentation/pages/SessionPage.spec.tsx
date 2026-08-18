import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../infrastructure/api-client';
import { characterApiClient } from '../../infrastructure/character-api-client';
import { QuotaExceededClientError, sessionApiClient } from '../../infrastructure/session-api-client';
import { SessionPage } from './SessionPage';

vi.mock('../../infrastructure/session-api-client', async () => {
  const actual = await vi.importActual<
    typeof import('../../infrastructure/session-api-client')
  >('../../infrastructure/session-api-client');
  return {
    QuotaExceededClientError: actual.QuotaExceededClientError,
    sessionApiClient: {
      getState: vi.fn(),
      submitTurnAction: vi.fn(),
      validateDelta: vi.fn(),
      rejectDelta: vi.fn(),
      deleteSession: vi.fn(),
      leaveSession: vi.fn(),
    },
  };
});

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockedNavigate };
});

vi.mock('../../infrastructure/api-client', () => ({
  apiClient: { fetchGameSystems: vi.fn() },
}));

vi.mock('../../infrastructure/character-api-client', () => ({
  characterApiClient: { listBySession: vi.fn() },
}));

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'user@test.dev', name: 'Test User' } }),
}));

const baseSession = {
  id: 'session-1',
  gameSystemId: 'gs-1',
  name: 'La quete du dragon',
  inviteCode: 'XK4R2P',
  status: 'narrating' as const,
  currentTurnNumber: 2,
  createdByUserId: 'gm-1',
  charactersVisibleToOthers: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const gameSystem = {
  id: 'gs-1',
  name: 'JdR de test',
  description: 'desc',
  adaptedForChildren: false,
  rulesText: 'regles',
  rulesSourceFileName: 'rules.pdf',
  characterSheetSchema: { hitPoints: { defaultMax: 30 }, inventory: { defaultItems: [] }, customAttributes: [] },
  mechanicalActions: [
    { actionKey: 'melee-attack', label: 'Attaque au corps a corps', diceFormula: '1d20+3' },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/sessions/session-1']}>
      <Routes>
        <Route path="/sessions/:id" element={<SessionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SessionPage', () => {
  beforeEach(() => {
    vi.mocked(characterApiClient.listBySession).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockedNavigate.mockReset();
    cleanup();
  });

  it('shows a dice-roll chip and a delta-proposal card for a resolved turn', async () => {
    vi.mocked(sessionApiClient.getState).mockResolvedValue({
      session: baseSession,
      players: [],
      recentTurns: [
        {
          turnNumber: 1,
          narrationText: 'Le gobelin encaisse le coup.',
          diceRolls: [
            {
              playerId: 'user-1',
              actionKey: 'melee-attack',
              actionLabel: 'Attaque au corps a corps',
              formula: '1d20+3',
              rolls: [14],
              total: 17,
            },
          ],
          pendingDeltas: [
            {
              id: 'delta-1',
              characterId: 'character-2',
              status: 'pending',
              hitPoints: -12,
              inventoryAdd: [],
              inventoryRemove: [],
              customAttributeChanges: {},
            },
          ],
          resolvedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    vi.mocked(apiClient.fetchGameSystems).mockResolvedValue([gameSystem]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('1d20+3 = 17')).toBeInTheDocument();
    });
    expect(screen.getByText('Points de vie')).toBeInTheDocument();
    expect(screen.getByText('-12')).toBeInTheDocument();
  });

  it('validates a pending delta and refreshes the session state', async () => {
    vi.mocked(sessionApiClient.getState).mockResolvedValue({
      session: baseSession,
      players: [],
      recentTurns: [
        {
          turnNumber: 1,
          narrationText: 'texte',
          diceRolls: [],
          pendingDeltas: [
            {
              id: 'delta-1',
              characterId: 'character-2',
              status: 'pending',
              hitPoints: -12,
              inventoryAdd: [],
              inventoryRemove: [],
              customAttributeChanges: {},
            },
          ],
          resolvedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    vi.mocked(apiClient.fetchGameSystems).mockResolvedValue([gameSystem]);
    vi.mocked(sessionApiClient.validateDelta).mockResolvedValue({
      id: 'delta-1',
      characterId: 'character-2',
      status: 'validated',
      inventoryAdd: [],
      inventoryRemove: [],
      customAttributeChanges: {},
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Points de vie');
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    await waitFor(() => {
      expect(sessionApiClient.validateDelta).toHaveBeenCalledWith('session-1', 1, 'delta-1');
    });
    expect(sessionApiClient.getState).toHaveBeenCalledTimes(2);
  });

  it('rejects a pending delta without applying it', async () => {
    vi.mocked(sessionApiClient.getState).mockResolvedValue({
      session: baseSession,
      players: [],
      recentTurns: [
        {
          turnNumber: 1,
          narrationText: 'texte',
          diceRolls: [],
          pendingDeltas: [
            {
              id: 'delta-1',
              characterId: 'character-2',
              status: 'pending',
              hitPoints: -12,
              inventoryAdd: [],
              inventoryRemove: [],
              customAttributeChanges: {},
            },
          ],
          resolvedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    vi.mocked(apiClient.fetchGameSystems).mockResolvedValue([gameSystem]);
    vi.mocked(sessionApiClient.rejectDelta).mockResolvedValue({
      id: 'delta-1',
      characterId: 'character-2',
      status: 'rejected',
      inventoryAdd: [],
      inventoryRemove: [],
      customAttributeChanges: {},
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Points de vie');
    await user.click(screen.getByRole('button', { name: 'Ignorer' }));

    await waitFor(() => {
      expect(sessionApiClient.rejectDelta).toHaveBeenCalledWith('session-1', 1, 'delta-1');
    });
  });

  it('shows a mechanical-action dropdown from the GameSystem and submits the chosen key', async () => {
    vi.mocked(sessionApiClient.getState).mockResolvedValue({
      session: { ...baseSession, status: 'waiting_for_players' },
      players: [],
      recentTurns: [],
    });
    vi.mocked(apiClient.fetchGameSystems).mockResolvedValue([gameSystem]);
    vi.mocked(sessionApiClient.submitTurnAction).mockResolvedValue({
      session: { ...baseSession, status: 'waiting_for_players' },
      submissionId: 'submission-1',
      resolved: false,
      narrationText: null,
    });

    const user = userEvent.setup();
    renderPage();

    const select = await screen.findByLabelText('Action mécanique');
    await user.selectOptions(select, 'melee-attack');
    fireEvent.change(screen.getByPlaceholderText('Que faites-vous ?'), {
      target: { value: 'Je frappe le gobelin' },
    });
    await user.click(screen.getByRole('button', { name: 'Soumettre mon action' }));

    await waitFor(() => {
      expect(sessionApiClient.submitTurnAction).toHaveBeenCalledWith(
        'session-1',
        'Je frappe le gobelin',
        'melee-attack',
      );
    });
  });

  it('shows a clear non-technical message when the daily LLM quota is exhausted (429)', async () => {
    vi.mocked(sessionApiClient.getState).mockResolvedValue({
      session: { ...baseSession, status: 'waiting_for_players' },
      players: [],
      recentTurns: [],
    });
    vi.mocked(apiClient.fetchGameSystems).mockResolvedValue([gameSystem]);
    vi.mocked(sessionApiClient.submitTurnAction).mockRejectedValue(
      new QuotaExceededClientError(),
    );

    const user = userEvent.setup();
    renderPage();

    fireEvent.change(await screen.findByPlaceholderText('Que faites-vous ?'), {
      target: { value: "J'ouvre la porte" },
    });
    await user.click(screen.getByRole('button', { name: 'Soumettre mon action' }));

    await waitFor(() => {
      expect(
        screen.getByText('Le MJ numérique a atteint sa limite du jour, réessaie plus tard'),
      ).toBeInTheDocument();
    });
  });

  it('shows "Supprimer la partie" for a solo session and deletes it on confirm', async () => {
    vi.mocked(sessionApiClient.getState).mockResolvedValue({
      session: baseSession,
      players: [{ userId: 'user-1', characterId: 'character-1', hasSubmittedCurrentTurn: false }],
      recentTurns: [],
    });
    vi.mocked(apiClient.fetchGameSystems).mockResolvedValue([gameSystem]);
    vi.mocked(sessionApiClient.deleteSession).mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    renderPage();

    const deleteButton = await screen.findByRole('button', { name: 'Supprimer la partie' });
    expect(screen.queryByRole('button', { name: 'Quitter la partie' })).not.toBeInTheDocument();
    await user.click(deleteButton);

    await waitFor(() => {
      expect(sessionApiClient.deleteSession).toHaveBeenCalledWith('session-1');
    });
    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('does not delete a solo session when the confirm dialog is dismissed', async () => {
    vi.mocked(sessionApiClient.getState).mockResolvedValue({
      session: baseSession,
      players: [{ userId: 'user-1', characterId: 'character-1', hasSubmittedCurrentTurn: false }],
      recentTurns: [],
    });
    vi.mocked(apiClient.fetchGameSystems).mockResolvedValue([gameSystem]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Supprimer la partie' }));

    expect(sessionApiClient.deleteSession).not.toHaveBeenCalled();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it('shows "Quitter la partie" for a group session and leaves it on confirm', async () => {
    vi.mocked(sessionApiClient.getState).mockResolvedValue({
      session: baseSession,
      players: [
        { userId: 'user-1', characterId: 'character-1', hasSubmittedCurrentTurn: false },
        { userId: 'user-2', characterId: 'character-2', hasSubmittedCurrentTurn: false },
      ],
      recentTurns: [],
    });
    vi.mocked(apiClient.fetchGameSystems).mockResolvedValue([gameSystem]);
    vi.mocked(sessionApiClient.leaveSession).mockResolvedValue({ sessionDeleted: false });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    renderPage();

    const leaveButton = await screen.findByRole('button', { name: 'Quitter la partie' });
    expect(screen.queryByRole('button', { name: 'Supprimer la partie' })).not.toBeInTheDocument();
    await user.click(leaveButton);

    await waitFor(() => {
      expect(sessionApiClient.leaveSession).toHaveBeenCalledWith('session-1');
    });
    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('navigates away after leaving even when the leave cascaded the whole session away', async () => {
    vi.mocked(sessionApiClient.getState).mockResolvedValue({
      session: baseSession,
      players: [
        { userId: 'user-1', characterId: 'character-1', hasSubmittedCurrentTurn: false },
        { userId: 'user-2', characterId: 'character-2', hasSubmittedCurrentTurn: false },
      ],
      recentTurns: [],
    });
    vi.mocked(apiClient.fetchGameSystems).mockResolvedValue([gameSystem]);
    vi.mocked(sessionApiClient.leaveSession).mockResolvedValue({ sessionDeleted: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Quitter la partie' }));

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/');
    });
  });
});
