import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../infrastructure/api-client';
import { AuthProvider, useAuth } from './AuthProvider';

vi.mock('../../infrastructure/api-client', () => ({
  apiClient: { fetchCurrentUser: vi.fn(), logout: vi.fn() },
}));

const user = { id: 'u1', email: 'a@b.c', name: 'Alice', avatarUrl: '' };

function Probe() {
  const { user: current, loading, logout } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <>
      <p>{current ? `in:${current.name}` : 'out'}</p>
      <button onClick={() => void logout()}>logout</button>
    </>
  );
}

async function renderProvider(navigate = vi.fn()) {
  vi.mocked(apiClient.fetchCurrentUser).mockResolvedValue(user);
  render(
    <AuthProvider navigate={navigate}>
      <Probe />
    </AuthProvider>,
  );
  await screen.findByText('in:Alice');
  return navigate;
}

describe('AuthProvider.logout', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('navigates (top-level) to home-auth when the server returns redirect_to, without clearing the user first', async () => {
    vi.mocked(apiClient.logout).mockResolvedValue({
      redirectTo: 'https://auth.example/logout?state=s',
    });
    const navigate = await renderProvider();

    await userEvent.click(screen.getByText('logout'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        'https://auth.example/logout?state=s',
      ),
    );
    expect(screen.getByText('in:Alice')).toBeTruthy();
  });

  it('local-only logout (redirectTo null): clears the user and does not navigate', async () => {
    vi.mocked(apiClient.logout).mockResolvedValue({ redirectTo: null });
    const navigate = await renderProvider();

    await userEvent.click(screen.getByText('logout'));

    await screen.findByText('out');
    expect(navigate).not.toHaveBeenCalled();
  });
});
