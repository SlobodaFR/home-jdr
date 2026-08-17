import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InventoryList } from './InventoryList';

describe('InventoryList', () => {
  it('shows an empty state when there are no items', () => {
    render(<InventoryList items={[]} />);

    expect(screen.getByText('Inventaire vide.')).toBeInTheDocument();
  });

  it('renders every item', () => {
    render(
      <InventoryList
        items={[
          { name: 'Torche', quantity: 1 },
          { name: 'Flèche', quantity: 12 },
        ]}
      />,
    );

    expect(screen.getByText('Torche')).toBeInTheDocument();
    expect(screen.getByText('Flèche')).toBeInTheDocument();
    expect(screen.getByText('x12')).toBeInTheDocument();
  });

  it('does not show a quantity badge for single items', () => {
    render(<InventoryList items={[{ name: 'Torche', quantity: 1 }]} />);

    expect(screen.queryByText('x1')).not.toBeInTheDocument();
  });
});
