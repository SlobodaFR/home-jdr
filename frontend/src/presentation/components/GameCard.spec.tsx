import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameCard } from './GameCard';
import { SessionStatusPill } from './SessionStatusPill';

afterEach(cleanup);

describe('GameCard', () => {
  it('renders game name, session name and last activity', () => {
    render(
      <GameCard
        gameName="Donjons & Dragons"
        sessionName="La forêt des murmures"
        lastActivityLabel="il y a 2h"
        statusSlot={<SessionStatusPill variant="waiting" label="2/4 joueurs" />}
      />,
    );

    expect(screen.getByText('Donjons & Dragons')).toBeTruthy();
    expect(screen.getByText('La forêt des murmures')).toBeTruthy();
    expect(screen.getByText('il y a 2h')).toBeTruthy();
    expect(screen.getByText('2/4 joueurs')).toBeTruthy();
  });

  it('is clickable when onClick is provided', () => {
    const onClick = vi.fn();
    render(
      <GameCard
        gameName="Donjons & Dragons"
        sessionName="La forêt des murmures"
        lastActivityLabel="il y a 2h"
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
