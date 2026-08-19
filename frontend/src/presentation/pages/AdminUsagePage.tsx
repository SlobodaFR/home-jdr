import { FormEvent, useCallback, useEffect, useState } from 'react';
import { UsageStats } from '../../domain/usage-stats';
import { apiClient } from '../../infrastructure/api-client';
import { BackButton } from '../components/BackButton';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { QuotaMeter } from '../components/QuotaMeter';
import { cx } from '../components/utils/cx';
import { AppHeader } from '../layout/AppHeader';
import { AppShell } from '../layout/AppShell';
import { ErrorBanner } from '../layout/ErrorBanner';
import { useAppNavItems } from '../layout/useAppNavItems';

/** Admin-only usage dashboard + quota form (see tasks/08-admin-quotas-cost-guardrails.md, mirrors AdminGameCatalogPage.tsx). */
export function AdminUsagePage() {
  const navItems = useAppNavItems();
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

  const remaining = stats ? Math.max(stats.dailyQuota - stats.usedToday, 0) : null;

  return (
    <AppShell navItems={navItems} header={<AppHeader />}>
      <div className="flex flex-col gap-xl">
        <div className="flex items-center gap-md">
          <BackButton to="/" />
          <h1 className="font-sans-ui text-heading-xl text-ink">Usage &amp; quotas</h1>
        </div>

        {loading && <p className="font-sans-body text-body-md text-mute">Chargement...</p>}
        {error && <ErrorBanner message={error} />}

        {stats && (
          <section className="flex flex-col gap-md">
            <h2 className="font-sans-ui text-heading-lg text-ink">Quota du jour</h2>
            <div className="grid grid-cols-1 tablet:grid-cols-3 gap-sm">
              <div className="bg-parchment rounded-md p-lg flex flex-col gap-xxs">
                <span className="font-sans-ui text-heading-lg text-ink">{stats.usedToday}</span>
                <span className="font-sans-body text-caption-sm text-mute">Utilisées / {stats.dailyQuota}</span>
              </div>
              <div className="bg-parchment rounded-md p-lg flex flex-col gap-xxs">
                <span className="font-sans-ui text-heading-lg text-ink">{remaining}</span>
                <span className="font-sans-body text-caption-sm text-mute">Restantes aujourd&apos;hui</span>
              </div>
              <div className="bg-parchment rounded-md p-lg flex flex-col gap-xxs">
                <span className="font-sans-ui text-heading-lg text-ink">{stats.totalCallsToday}</span>
                <span className="font-sans-body text-caption-sm text-mute">Appels LLM au total</span>
              </div>
            </div>
            <QuotaMeter
              usedPercent={stats.usedPercent}
              label={`${stats.usedToday} / ${stats.dailyQuota} résolutions utilisées aujourd'hui (${stats.usedPercent}%)`}
            />
            <p className="font-sans-body text-caption-sm text-mute">
              {stats.totalCallsToday} appels LLM au total aujourd&apos;hui (résolutions + résumés).
            </p>
          </section>
        )}

        {stats && (
          <section className="flex flex-col gap-md">
            <h2 className="font-sans-ui text-heading-lg text-ink">Tendance (7 derniers jours)</h2>
            <ul className="flex flex-col gap-sm">
              {(() => {
                const maxCalls = Math.max(1, ...stats.trend.map((day) => day.totalCalls));
                const lastDate = stats.trend[stats.trend.length - 1]?.date;
                return stats.trend.map((day) => (
                  <li key={day.date} className="flex flex-col gap-xxs">
                    <div className="flex items-center justify-between font-sans-body text-caption-md">
                      <span className={day.date === lastDate ? 'text-ink' : 'text-mute'}>{day.date}</span>
                      <span className="font-sans-body text-body-strong text-ink">
                        {day.totalCalls} appel{day.totalCalls > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-sm bg-hairline-soft overflow-hidden">
                      <div
                        className={cx('h-full rounded-sm', day.date === lastDate ? 'bg-ink' : 'bg-info')}
                        style={{ width: `${Math.max((day.totalCalls / maxCalls) * 100, day.totalCalls > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </li>
                ));
              })()}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-md">
          <h2 className="font-sans-ui text-heading-lg text-ink">Modifier le quota journalier</h2>
          <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-sm max-w-xs">
            <label className="flex flex-col gap-xs">
              <span className="font-sans-body text-body-strong text-ink">Quota (appels/jour)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={quotaInput}
                onChange={(event) => setQuotaInput(event.target.value)}
                className="w-full bg-canvas border border-hairline rounded-sm px-md py-sm font-sans-body text-body-md text-ink focus:outline-none focus:border-2 focus:border-ink"
                required
              />
            </label>
            {saveError && <ErrorBanner message={saveError} />}
            <ButtonPrimary type="submit" disabled={saving} className="self-start">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </ButtonPrimary>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
