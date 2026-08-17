import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionInput } from './ActionInput';

describe('ActionInput', () => {
  it('renders a textarea and reports value changes', () => {
    const onChange = vi.fn();
    render(<ActionInput placeholder="Décris ton action" value="" onChange={onChange} />);

    const textarea = screen.getByPlaceholderText('Décris ton action');
    fireEvent.change(textarea, { target: { value: "J'ouvre la porte" } });

    expect(onChange).toHaveBeenCalled();
  });
});
