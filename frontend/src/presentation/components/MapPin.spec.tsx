import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MapPin } from './MapPin';

afterEach(cleanup);

describe('MapPin', () => {
  it('renders the default variant', () => {
    render(<MapPin label="Auberge du Cerf" />);
    const pin = screen.getByRole('button', { name: 'Auberge du Cerf' });
    expect(pin.className).toContain('bg-ink');
    expect(pin.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders the active variant and forwards clicks', () => {
    const onClick = vi.fn();
    render(<MapPin label="Auberge du Cerf" active onClick={onClick} />);
    const pin = screen.getByRole('button', { name: 'Auberge du Cerf' });

    expect(pin.className).toContain('bg-accent-gold');
    expect(pin.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(pin);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
