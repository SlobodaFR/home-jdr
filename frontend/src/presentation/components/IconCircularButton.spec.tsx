import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IconCircularButton } from './IconCircularButton';

describe('IconCircularButton', () => {
  it('exposes an accessible label and forwards clicks', () => {
    const onClick = vi.fn();
    render(<IconCircularButton icon={<span>*</span>} ariaLabel="Retour" onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Retour' });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
