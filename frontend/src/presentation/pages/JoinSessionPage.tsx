import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionApiClient } from '../../infrastructure/session-api-client';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { ButtonSecondary } from '../components/ButtonSecondary';

/**
 * "Rejoindre une partie": enter an invite code shared out-of-app (Discord,
 * SMS...) - see PRD.md, no invitation nominative / no public session list.
 */
export function JoinSessionPage() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!inviteCode.trim() || !characterName.trim()) {
      setError('Le code et le nom de personnage sont requis.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const session = await sessionApiClient.join({
        inviteCode: inviteCode.trim(),
        characterName,
      });
      navigate(`/sessions/${session.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossible de rejoindre cette partie.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-lg py-section">
      <h1 className="font-sans-ui text-heading-xl text-ink mb-xl">Rejoindre une partie</h1>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-lg max-w-sm">
        <label className="flex flex-col gap-xs">
          <span className="font-body-strong text-ink">Code d&apos;invitation</span>
          <input
            className="border border-hairline rounded-sm px-md py-sm font-mono-ui text-label-dice text-ink bg-canvas focus:border-2 focus:border-ink outline-none uppercase"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            placeholder="XK4R2P"
          />
        </label>

        <label className="flex flex-col gap-xs">
          <span className="font-body-strong text-ink">Nom de votre personnage</span>
          <input
            className="border border-hairline rounded-sm px-md py-sm font-body-md text-ink bg-canvas focus:border-2 focus:border-ink outline-none"
            value={characterName}
            onChange={(event) => setCharacterName(event.target.value)}
          />
        </label>

        {error && <p className="font-body-md text-danger">{error}</p>}

        <div className="flex gap-md">
          <ButtonPrimary type="submit" disabled={submitting}>
            Rejoindre
          </ButtonPrimary>
          <ButtonSecondary onClick={() => navigate('/')}>Annuler</ButtonSecondary>
        </div>
      </form>
    </main>
  );
}
