import { FormEvent, useCallback, useEffect, useState } from 'react';
import { UsageStats } from '../../domain/usage-stats';
import { apiClient } from '../../infrastructure/api-client';
import { QuotaMeter } from '../components/QuotaMeter';

/** Admin-only usage dashboard + quota form (see tasks/08-admin-quotas-cost-guardrails.md, mirrors AdminGameCatalogPage.tsx). */
export function AdminUsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaInput, setQuotaInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    return apiClient
      .fetchUsageStats()
      .then((fetched) => {
        setStats(fetched);
        setQuotaInput(String(fetched.dailyQuota));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(quotaInput);
    if (!Number.isInteger(value) || value < 1) {
      setSaveError('Le quota doit être un nombre entier positif.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await apiClient.updateDailyLlmQuota(value);
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'La mise à jour a échoué.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-lg py-section flex flex-col gap-xl">
      <h1 className="font-sans-ui text-heading-xl text-ink">Usage &amp; quotas</h1>

      {loading && <p className="font-body-md text-mute">Chargement...</p>}
      {error && <p className="font-body-md text-danger">{error}</p>}

      {stats && (
        <section className="flex flex-col gap-md">
          <h2 className="font-heading-lg text-ink">Quota du jour</h2>
          <QuotaMeter
            usedPercent={stats.usedPercent}
            label={`${stats.usedToday} / ${stats.dailyQuota} résolutions utilisées aujourd'hui (${stats.usedPercent}%)`}
          />
          <p className="font-caption-sm text-mute">
            {stats.totalCallsToday} appels LLM au total aujourd&apos;hui (résolutions + résumés).
          </p>
        </section>
      )}

      {stats && (
        <section className="flex flex-col gap-md">
          <h2 className="font-heading-lg text-ink">Tendance (7 derniers jours)</h2>
          <ul className="flex flex-col gap-xxs">
            {stats.trend.map((day) => (
              <li key={day.date} className="flex items-center justify-between font-body-md text-ink">
                <span className="text-mute">{day.date}</span>
                <span>{day.totalCalls} appel{day.totalCalls > 1 ? 's' : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-md">
        <h2 className="font-heading-lg text-ink">Modifier le quota journalier</h2>
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-sm max-w-xs">
          <label className="flex flex-col gap-xs">
            <span className="font-body-strong text-ink">Quota (appels/jour)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={quotaInput}
              onChange={(event) => setQuotaInput(event.target.value)}
              className="w-full bg-canvas border border-hairline rounded-sm px-md py-sm font-body-md text-ink focus:outline-none focus:border-2 focus:border-ink"
              required
            />
          </label>
          {saveError && <p className="font-body-md text-danger">{saveError}</p>}
          <button
            type="submit"
            disabled={saving}
            className="self-start bg-ink text-on-primary px-xl py-md rounded-lg font-button-md disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </section>
    </main>
  );
}
