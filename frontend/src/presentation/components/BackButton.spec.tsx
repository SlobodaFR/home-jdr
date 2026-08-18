import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BackButton } from './BackButton';

describe('BackButton', () => {
  it('navigates to an explicit destination when "to" is given', () => {
    render(
      <MemoryRouter initialEntries={['/sessions/abc/map']}>
        <Routes>
          <Route path="/sessions/:id/map" element={<BackButton to="/sessions/abc" />} />
          <Route path="/sessions/abc" element={<p>Session home</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(screen.getByText('Session home')).toBeInTheDocument();
  });

  it('falls back to browser-style back (history -1) when no "to" is given', () => {
    render(
      <MemoryRouter initialEntries={['/', '/jeux']} initialIndex={1}>
        <Routes>
          <Route path="/" element={<p>Home</p>} />
          <Route path="/jeux" element={<BackButton />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
