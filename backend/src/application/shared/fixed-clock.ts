import { ClockPort } from '../../domain/shared/clock.port';

/** Test double for `ClockPort` - lets specs control "now" and simulate day changes deterministically. */
export class FixedClock extends ClockPort {
  constructor(private current: Date) {
    super();
  }

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }
}
