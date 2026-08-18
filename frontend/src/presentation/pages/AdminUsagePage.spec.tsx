import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../infrastructure/api-client';
import { AdminUsagePage } from './AdminUsagePage';

vi.mock('../../infrastructure/api-client', () => ({
  apiClient: {
    fetchUsageStats: vi.fn(),
    updateDailyLlmQuota: vi.fn(),
  },
}));

const stats = {
  dailyQuota: 50,
  usedToday: 40,
  usedPercent: 80,
  totalCallsToday: 42,
  trend: [
    { date: '2026-03-04', totalCalls: 3 },
    { date: '2026-03-05', totalCalls: 5 },
    { date: '2026-03-06', totalCalls: 2 },
    { date: '2026-03-07', totalCalls: 4 },
    { date: '2026-03-08', totalCalls: 1 },
    { date: '2026-03-09', totalCalls: 6 },
    { date: '2026-03-10', totalCalls: 42 },
  ],
};

describe('AdminUsagePage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('shows the quota meter fed by GET /api/admin/usage', async () => {
    vi.mocked(apiClient.fetchUsageStats).mockResolvedValue(stats);

    render(
      <MemoryRouter>
        <AdminUsagePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('80');
    expect(screen.getByText(/42 appels LLM au total/)).toBeInTheDocument();
  });

  it('submits an updated daily quota and refreshes the stats', async () => {
    vi.mocked(apiClient.fetchUsageStats).mockResolvedValue(stats);
    vi.mocked(apiClient.updateDailyLlmQuota).mockResolvedValue({
      key: 'daily-llm-quota',
      value: '80',
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminUsagePage />
      </MemoryRouter>,
    );

    const input = await screen.findByLabelText('Quota (appels/jour)');
    await user.clear(input);
    await user.type(input, '80');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(apiClient.updateDailyLlmQuota).toHaveBeenCalledWith(80);
    });
    expect(apiClient.fetchUsageStats).toHaveBeenCalledTimes(2);
  });
});
