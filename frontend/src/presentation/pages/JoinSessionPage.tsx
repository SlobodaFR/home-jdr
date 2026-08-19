import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionApiClient } from '../../infrastructure/session-api-client';
import { BackButton } from '../components/BackButton';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { ButtonSecondary } from '../components/ButtonSecondary';
import { AppHeader } from '../layout/AppHeader';
import { AppShell } from '../layout/AppShell';
import { ErrorBanner } from '../layout/ErrorBanner';
import { useAppNavItems } from '../layout/useAppNavItems';

/**
 * "Rejoindre une partie": enter an invite code shared out-of-app (Discord,
 * SMS...) - see PRD.md, no invitation nominative / no public session list.
 * On success, navigates to the guided character-creation chat screen (see
 * `CharacterCreationChatPage.tsx`) rather than an instant character-name
 * field.
 */
export function JoinSessionPage() {
  const navigate = useNavigate();
  const navItems = useAppNavItems();
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!inviteCode.trim()) {
      setError("Le code d'invitation est requis.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const session = await sessionApiClient.join({
        inviteCode: inviteCode.trim(),
      });
      navigate(`/character-creation/${session.characterCreationSessionId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossible de rejoindre cette partie.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell navItems={navItems} header={<AppHeader />}>
      <div className="flex items-center gap-md mb-xl">
        <BackButton to="/" />
        <h1 className="font-sans-ui text-heading-xl text-ink">Rejoindre une partie</h1>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-lg max-w-sm">
        <label className="flex flex-col gap-xs">
          <span className="font-sans-body text-body-strong text-ink">Code d&apos;invitation</span>
          <input
            className="border border-hairline rounded-sm px-md py-md font-mono-ui text-label-dice text-ink bg-canvas focus:border-2 focus:border-ink outline-none uppercase tracking-widest text-center"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            placeholder="XK4R2P"
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
          />
          <span className="font-sans-body text-caption-md text-mute">
            Code partagé par l&apos;hôte de la partie (hors application).
          </span>
        </label>

        {error && <ErrorBanner message={error} />}

        <div className="flex gap-md">
          <ButtonPrimary type="submit" disabled={submitting}>
            {submitting ? 'Connexion...' : 'Rejoindre'}
          </ButtonPrimary>
          <ButtonSecondary onClick={() => navigate('/')}>Annuler</ButtonSecondary>
        </div>
      </form>
    </AppShell>
  );
}
