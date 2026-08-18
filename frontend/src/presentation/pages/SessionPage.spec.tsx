import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../infrastructure/api-client';
import { sessionApiClient } from '../../infrastructure/session-api-client';
import { SessionPage } from './SessionPage';

vi.mock('../../infrastructure/session-api-client', () => ({
  sessionApiClient: {
    getState: vi.fn(),
    submitTurnAction: vi.fn(),
    validateDelta: vi.fn(),
    rejectDelta: vi.fn(),
  },
}));

vi.mock('../../infrastructure/api-client', () => ({
  apiClient: { fetchGameSystems: vi.fn() },
}));

const baseSession = {
  id: 'session-1',
  gameSystemId: 'gs-1',
  name: 'La quete du dragon',
  inviteCode: 'XK4R2P',
  status: 'narrating' as const,
  currentTurnNumber: 2,
  createdByUserId: 'gm-1',
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
  afterEach(() => {
    vi.restoreAllMocks();
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
});
