import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionApiClient } from '../../infrastructure/session-api-client';
import { worldMapApiClient } from '../../infrastructure/world-map-api-client';
import { useAuth } from '../auth/AuthProvider';
import { WorldMapPage } from './WorldMapPage';

vi.mock('../../infrastructure/world-map-api-client', () => ({
  worldMapApiClient: {
    get: vi.fn(),
    generate: vi.fn(),
    addPin: vi.fn(),
    updatePin: vi.fn(),
    removePin: vi.fn(),
  },
}));

vi.mock('../../infrastructure/session-api-client', () => ({
  sessionApiClient: { getState: vi.fn() },
}));

vi.mock('../auth/AuthProvider', () => ({ useAuth: vi.fn() }));

const sessionState = {
  session: {
    id: 'session-1',
    gameSystemId: 'gs-1',
    name: 'Ma partie',
    inviteCode: 'XK4R2P',
    status: 'waiting_for_players' as const,
    currentTurnNumber: 1,
    createdByUserId: 'gm-1',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  players: [],
  recentTurns: [],
};

const pin = {
  id: 'pin-1',
  worldMapId: 'world-map-1',
  label: 'Le village de Bree',
  positionX: 0.4,
  positionY: 0.6,
  notes: '',
  createdByUserId: 'gm-1',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const worldMap = {
  id: 'world-map-1',
  sessionId: 'session-1',
  imageUrl: 'https://minio.example.com/bucket/world-maps/session-1/map.png',
  generationPrompt: 'Carte du monde',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/sessions/session-1/map']}>
      <Routes>
        <Route path="/sessions/:id/map" element={<WorldMapPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WorldMapPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('shows the "Régénérer la carte" button to the session creator once a map exists', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'gm-1', email: 'gm@test.dev', name: 'GM', avatarUrl: '' },
      loading: false,
      logout: vi.fn(),
    });
    vi.mocked(sessionApiClient.getState).mockResolvedValue(sessionState);
    vi.mocked(worldMapApiClient.get).mockResolvedValue({ worldMap, pins: [pin] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Régénérer la carte' })).toBeInTheDocument();
    });
  });

  it('hides the regenerate button from a non-creator player', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'player-1', email: 'player@test.dev', name: 'Player', avatarUrl: '' },
      loading: false,
      logout: vi.fn(),
    });
    vi.mocked(sessionApiClient.getState).mockResolvedValue(sessionState);
    vi.mocked(worldMapApiClient.get).mockResolvedValue({ worldMap, pins: [pin] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByAltText('Carte du monde')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Régénérer la carte' })).not.toBeInTheDocument();
  });

  it('renders a pin positioned from its relative coordinates', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'gm-1', email: 'gm@test.dev', name: 'GM', avatarUrl: '' },
      loading: false,
      logout: vi.fn(),
    });
    vi.mocked(sessionApiClient.getState).mockResolvedValue(sessionState);
    vi.mocked(worldMapApiClient.get).mockResolvedValue({ worldMap, pins: [pin] });

    renderPage();

    const pinButton = await screen.findByRole('button', { name: 'Le village de Bree' });
    const wrapper = pinButton.parentElement as HTMLElement;
    expect(wrapper.style.left).toBe('40%');
    expect(wrapper.style.top).toBe('60%');
  });

  it('adds a pin at the clicked relative position', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'gm-1', email: 'gm@test.dev', name: 'GM', avatarUrl: '' },
      loading: false,
      logout: vi.fn(),
    });
    vi.mocked(sessionApiClient.getState).mockResolvedValue(sessionState);
    vi.mocked(worldMapApiClient.get).mockResolvedValue({ worldMap, pins: [] });
    vi.mocked(worldMapApiClient.addPin).mockResolvedValue(pin);

    const user = userEvent.setup();
    renderPage();

    const container = await screen.findByTestId('world-map-image-container');
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 500,
      right: 1000,
      bottom: 500,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.click(container, { clientX: 400, clientY: 250 });

    await user.type(screen.getByLabelText('Nom du lieu'), 'Auberge du Cerf');
    await user.click(screen.getByRole('button', { name: 'Ajouter le lieu' }));

    await waitFor(() => {
      expect(worldMapApiClient.addPin).toHaveBeenCalledWith('session-1', {
        label: 'Auberge du Cerf',
        positionX: 0.4,
        positionY: 0.5,
      });
    });
  });

  it('shows an access-denied message when the API rejects the request', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'stranger', email: 'stranger@test.dev', name: 'Stranger', avatarUrl: '' },
      loading: false,
      logout: vi.fn(),
    });
    vi.mocked(sessionApiClient.getState).mockRejectedValue(new Error('Forbidden'));
    vi.mocked(worldMapApiClient.get).mockRejectedValue(new Error('Forbidden'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Impossible de charger la carte.')).toBeInTheDocument();
    });
  });
});
