import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Character } from '../../domain/character';
import { characterApiClient } from '../../infrastructure/character-api-client';
import { CharacterSheet } from '../character/CharacterSheet';

export function CharacterSheetPage() {
  const { id } = useParams<{ id: string }>();
  const [character, setCharacter] = useState<Character | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    characterApiClient
      .getById(id)
      .then(setCharacter)
      .catch(() => setError('Impossible de charger la fiche personnage.'));
  }, [id]);

  if (error) {
    return (
      <main className="min-h-screen bg-canvas px-lg py-section">
        <p className="font-body-md text-danger">{error}</p>
      </main>
    );
  }

  if (!character) {
    return (
      <main className="min-h-screen bg-canvas px-lg py-section">
        <p className="font-body-md text-mute">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas px-lg py-section">
      <h1 className="font-sans-ui text-heading-xl text-ink mb-xl">Fiche personnage</h1>
      <CharacterSheet character={character} />
    </main>
  );
}
