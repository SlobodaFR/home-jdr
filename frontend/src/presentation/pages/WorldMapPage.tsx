import {
  FormEvent,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useParams } from 'react-router-dom';
import { WorldMapView } from '../../domain/world-map';
import { worldMapApiClient } from '../../infrastructure/world-map-api-client';
import { sessionApiClient } from '../../infrastructure/session-api-client';
import { useAuth } from '../auth/AuthProvider';
import { BackButton } from '../components/BackButton';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { ButtonSecondary } from '../components/ButtonSecondary';
import { MapPin } from '../components/MapPin';
import { SessionStatusPill } from '../components/SessionStatusPill';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function relativePositionFromEvent(
  event: { clientX: number; clientY: number },
  container: HTMLElement,
): { x: number; y: number } {
  const rect = container.getBoundingClientRect();
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  };
}

/**
 * "Carte du monde": full-bleed generated image with manually-placed pins
 * (see tasks/05-world-map.md and DESIGN.md - "Zone de carte du monde").
 * Pin placement/drag uses relative coordinates (0-1) captured from the
 * rendered image, so it stays correct at any screen size.
 */
export function WorldMapPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [sessionName, setSessionName] = useState('');
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [view, setView] = useState<WorldMapView | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [pinLabel, setPinLabel] = useState('');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const imageContainerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    if (!id) {
      return;
    }
    worldMapApiClient
      .get(id)
      .then(setView)
      .catch(() => setError('Impossible de charger la carte.'));
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }
    setLoading(true);
    Promise.all([
      sessionApiClient.getState(id).then((state) => {
        setSessionName(state.session.name);
        setCreatorId(state.session.createdByUserId);
      }),
      worldMapApiClient.get(id).then(setView),
    ])
      .catch(() => setError('Impossible de charger la carte.'))
      .finally(() => setLoading(false));
  }, [id]);

  const isGm = !!user && !!creatorId && user.id === creatorId;

  async function handleGenerate() {
    if (!id) {
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      await worldMapApiClient.generate(id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La génération de la carte a échoué.');
    } finally {
      setGenerating(false);
    }
  }

  function handleMapClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (!view?.worldMap || !imageContainerRef.current || draggingPinId) {
      return;
    }
    const position = relativePositionFromEvent(event, imageContainerRef.current);
    setPendingPosition(position);
    setSelectedPinId(null);
    setPinLabel('');
  }

  async function handleAddPin(event: FormEvent) {
    event.preventDefault();
    if (!id || !pendingPosition || !pinLabel.trim()) {
      return;
    }
    try {
      await worldMapApiClient.addPin(id, {
        label: pinLabel.trim(),
        positionX: pendingPosition.x,
        positionY: pendingPosition.y,
      });
      setPendingPosition(null);
      setPinLabel('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'ajout du lieu a échoué.");
    }
  }

  async function handleRemovePin(pinId: string) {
    if (!id) {
      return;
    }
    try {
      await worldMapApiClient.removePin(id, pinId);
      setSelectedPinId(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La suppression du lieu a échoué.');
    }
  }

  function handlePinMouseDown(pinId: string, event: ReactMouseEvent) {
    event.stopPropagation();
    setSelectedPinId(pinId);
    setDraggingPinId(pinId);
  }

  function handleContainerMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (!draggingPinId || !imageContainerRef.current) {
      return;
    }
    setDragPosition(relativePositionFromEvent(event, imageContainerRef.current));
  }

  async function handleContainerMouseUp() {
    if (!id || !draggingPinId || !dragPosition) {
      setDraggingPinId(null);
      setDragPosition(null);
      return;
    }
    const pinId = draggingPinId;
    const position = dragPosition;
    setDraggingPinId(null);
    setDragPosition(null);
    try {
      await worldMapApiClient.updatePin(id, pinId, {
        positionX: position.x,
        positionY: position.y,
      });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le déplacement du lieu a échoué.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-canvas px-lg py-section">
        <p className="font-body-md text-mute">Chargement...</p>
      </main>
    );
  }

  const selectedPin = view?.pins.find((pin) => pin.id === selectedPinId) ?? null;

  return (
    <main className="min-h-screen bg-canvas flex flex-col gap-lg">
      <div className="px-lg pt-section flex items-center justify-between flex-wrap gap-sm">
        <div className="flex items-center gap-md">
          <BackButton to={`/sessions/${id}`} />
          <h1 className="font-sans-ui text-heading-xl text-ink">Carte - {sessionName}</h1>
        </div>
        <div className="flex items-center gap-sm">
          {generating && (
            <SessionStatusPill variant="resolving" label="Génération de la carte en cours..." />
          )}
          {isGm && (
            <ButtonSecondary onClick={() => void handleGenerate()} disabled={generating}>
              {view?.worldMap ? 'Régénérer la carte' : 'Générer la carte'}
            </ButtonSecondary>
          )}
        </div>
      </div>

      {error && <p className="px-lg font-body-md text-danger">{error}</p>}

      {!view?.worldMap && !isGm && (
        <p className="px-lg font-body-md text-mute">
          En attente que le MJ génère la carte du monde.
        </p>
      )}

      {view?.worldMap ? (
        <div
          ref={imageContainerRef}
          data-testid="world-map-image-container"
          className="relative w-full rounded-none select-none"
          onClick={handleMapClick}
          onMouseMove={handleContainerMouseMove}
          onMouseUp={() => void handleContainerMouseUp()}
        >
          <img
            src={view.worldMap.imageUrl ?? undefined}
            alt="Carte du monde"
            className="w-full h-auto block pointer-events-none"
          />
          {view.pins.map((pin) => {
            const isDragging = draggingPinId === pin.id && dragPosition;
            const x = isDragging ? dragPosition!.x : pin.positionX;
            const y = isDragging ? dragPosition!.y : pin.positionY;
            return (
              <div
                key={pin.id}
                style={{ position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, transform: 'translate(-50%, -50%)' }}
              >
                <MapPin
                  label={pin.label}
                  active={selectedPinId === pin.id}
                  onClick={() => setSelectedPinId(pin.id)}
                  className="cursor-grab"
                />
                {/* Extra hit-area to start a drag without relying on the button's own onClick */}
                <span
                  className="sr-only"
                  onMouseDown={(event) => handlePinMouseDown(pin.id, event)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        isGm && (
          <p className="px-lg font-body-md text-mute">
            Aucune carte pour le moment - cliquez sur « Générer la carte ».
          </p>
        )
      )}

      {selectedPin && (
        <div className="px-lg flex flex-col gap-xs">
          <p className="font-body-strong text-ink">{selectedPin.label}</p>
          {selectedPin.notes && <p className="font-body-md text-ash">{selectedPin.notes}</p>}
          <ButtonSecondary onClick={() => void handleRemovePin(selectedPin.id)}>
            Supprimer ce lieu
          </ButtonSecondary>
        </div>
      )}

      {pendingPosition && (
        <form
          onSubmit={(event) => void handleAddPin(event)}
          className="px-lg pb-section flex flex-col gap-sm max-w-sm"
        >
          <label className="flex flex-col gap-xs">
            <span className="font-body-strong text-ink">Nom du lieu</span>
            <input
              autoFocus
              className="border border-hairline rounded-sm px-md py-sm font-body-md text-ink bg-canvas focus:border-2 focus:border-ink outline-none"
              value={pinLabel}
              onChange={(event) => setPinLabel(event.target.value)}
            />
          </label>
          <div className="flex gap-md">
            <ButtonPrimary type="submit" disabled={!pinLabel.trim()}>
              Ajouter le lieu
            </ButtonPrimary>
            <ButtonSecondary type="button" onClick={() => setPendingPosition(null)}>
              Annuler
            </ButtonSecondary>
          </div>
        </form>
      )}
    </main>
  );
}
