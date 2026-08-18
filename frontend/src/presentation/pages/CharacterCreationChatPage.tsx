import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CharacterCreationSession } from '../../domain/character-creation';
import { InventoryItem } from '../../domain/character';
import {
  characterCreationApiClient,
} from '../../infrastructure/character-creation-api-client';
import { QuotaExceededClientError } from '../../infrastructure/session-api-client';
import { ActionInput } from '../components/ActionInput';
import { BackButton } from '../components/BackButton';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { ButtonSecondary } from '../components/ButtonSecondary';
import { CharacterStatBar } from '../character/CharacterStatBar';
import { InventoryList } from '../character/InventoryList';

/** Fallback hit-point max for the live preview, before the AI has proposed one. */
const DEFAULT_PREVIEW_HIT_POINTS = 20;

function draftInventoryItems(inventory?: string[]): InventoryItem[] {
  return (inventory ?? []).map((name) => ({ name, quantity: 1 }));
}

/**
 * "Créer mon personnage" via une conversation guidée avec le MJ numérique
 * (voir `PRD.md` addendum - "Character creation is a guided AI
 * conversation"). Remplace l'ancien formulaire instantané
 * (`CreateCharacterPage.tsx`) pour le flux partie - session/rejoindre.
 */
export function CharacterCreationChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<CharacterCreationSession | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!id) {
      return;
    }
    characterCreationApiClient
      .getById(id)
      .then(setSession)
      .catch(() => setLoadError('Impossible de charger la création de personnage.'));
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!id || !messageText.trim() || !session || session.status === 'completed') {
      return;
    }

    setSending(true);
    setError(null);
    try {
      const updated = await characterCreationApiClient.sendMessage(id, messageText);
      setSession(updated);
      setMessageText('');
    } catch (err) {
      if (err instanceof QuotaExceededClientError) {
        setError('Le MJ numérique a atteint sa limite du jour, réessaie plus tard');
      } else {
        setError(err instanceof Error ? err.message : "L'envoi du message a échoué.");
      }
    } finally {
      setSending(false);
    }
  }

  async function handleFinalize() {
    if (!id) {
      return;
    }
    setFinalizing(true);
    setError(null);
    try {
      const result = await characterCreationApiClient.finalize(id);
      navigate(`/sessions/${result.sessionPlayer.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La validation de la fiche a échoué.');
    } finally {
      setFinalizing(false);
    }
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-canvas px-lg py-section">
        <p className="font-body-md text-danger">{loadError}</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-canvas px-lg py-section">
        <p className="font-body-md text-mute">Chargement...</p>
      </main>
    );
  }

  const draft = session.draftCharacter;
  const isCompleted = session.status === 'completed';
  const canFinalize = Boolean(draft.name && draft.name.trim());

  return (
    <main className="min-h-screen bg-canvas px-lg py-section flex flex-col gap-xl">
      <div className="flex items-center gap-md">
        <BackButton to="/" />
        <h1 className="font-sans-ui text-heading-xl text-ink">Créer mon personnage</h1>
      </div>

      <section className="flex flex-col gap-md">
        {session.messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-sm rounded-md px-md py-sm font-body-md ${
              message.role === 'assistant'
                ? 'bg-hairline-soft text-ink self-start'
                : 'bg-ink text-on-primary self-end ml-auto'
            }`}
          >
            {message.content}
          </div>
        ))}
      </section>

      <section className="border border-hairline rounded-md p-md flex flex-col gap-sm">
        <h2 className="font-sans-ui text-heading-md text-ink">Brouillon de fiche</h2>
        <p className="font-body-strong text-ink">{draft.name ?? 'Personnage sans nom pour le moment'}</p>
        <CharacterStatBar
          label="Points de vie"
          current={draft.hitPointsMax ?? DEFAULT_PREVIEW_HIT_POINTS}
          max={draft.hitPointsMax ?? DEFAULT_PREVIEW_HIT_POINTS}
        />
        <InventoryList items={draftInventoryItems(draft.inventory)} />
      </section>

      {!isCompleted && (
        <form onSubmit={(event) => void handleSend(event)} className="flex flex-col gap-sm">
          <ActionInput
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="Décris ton personnage..."
            disabled={sending}
          />
          {error && <p className="font-body-md text-danger">{error}</p>}
          <div className="flex gap-md flex-wrap">
            <ButtonSecondary type="submit" disabled={sending || !messageText.trim()}>
              Envoyer
            </ButtonSecondary>
            <ButtonPrimary
              type="button"
              disabled={finalizing || !canFinalize}
              onClick={() => void handleFinalize()}
            >
              Valider ma fiche
            </ButtonPrimary>
          </div>
        </form>
      )}

      {isCompleted && (
        <p className="font-body-md text-mute">
          Cette fiche a déjà été validée - la conversation est terminée.
        </p>
      )}
    </main>
  );
}
