import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { QuotaMeter } from './QuotaMeter';

afterEach(cleanup);

describe('QuotaMeter', () => {
  it('renders an info fill under the 80% threshold', () => {
    render(<QuotaMeter usedPercent={45} label="45% utilisé aujourd'hui" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.firstElementChild?.className).toContain('bg-info');
  });

  it('renders a danger fill at or above the 80% threshold', () => {
    render(<QuotaMeter usedPercent={92} label="92% utilisé aujourd'hui" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.firstElementChild?.className).toContain('bg-danger');
  });
});
