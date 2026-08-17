import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Character } from '../../domain/character';
import { CharacterSheet } from './CharacterSheet';

describe('CharacterSheet', () => {
  const character: Character = {
    id: 'char-1',
    gameSystemId: 'game-system-1',
    sessionId: 'session-1',
    ownerUserId: 'user-1',
    name: 'Aragorn',
    hitPointsMax: 20,
    hitPointsCurrent: 15,
    inventory: [{ name: 'Torche', quantity: 1 }],
    customAttributes: { strength: 12 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('renders the character name, stats and inventory', () => {
    render(<CharacterSheet character={character} />);

    expect(screen.getByText('Aragorn')).toBeInTheDocument();
    expect(screen.getByText('15 / 20')).toBeInTheDocument();
    expect(screen.getByText('Torche')).toBeInTheDocument();
    expect(screen.getByText('strength')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders a compact heading in compact mode', () => {
    render(<CharacterSheet character={character} compact />);

    expect(screen.queryByRole('heading', { name: 'Aragorn' })).not.toBeInTheDocument();
    expect(screen.getByText('Aragorn')).toBeInTheDocument();
  });
});
