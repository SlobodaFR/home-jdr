import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CharacterStatBar } from './CharacterStatBar';

describe('CharacterStatBar', () => {
  it('renders the label and current/max values', () => {
    render(<CharacterStatBar label="Points de vie" current={15} max={20} />);

    expect(screen.getByText('Points de vie')).toBeInTheDocument();
    expect(screen.getByText('15 / 20')).toBeInTheDocument();
  });

  it('is not critical above the threshold', () => {
    render(<CharacterStatBar label="Points de vie" current={15} max={20} />);

    expect(screen.getByTestId('character-stat-bar')).toHaveAttribute(
      'data-critical',
      'false',
    );
  });

  it('switches to critical at or below 25% of max', () => {
    render(<CharacterStatBar label="Points de vie" current={5} max={20} />);

    expect(screen.getByTestId('character-stat-bar')).toHaveAttribute(
      'data-critical',
      'true',
    );
  });

  it('never renders a negative or overflowing fill ratio', () => {
    const { container } = render(
      <CharacterStatBar label="Points de vie" current={-5} max={20} />,
    );

    const fill = container.querySelector('[style]');
    expect(fill).toHaveStyle({ width: '0%' });
  });
});
