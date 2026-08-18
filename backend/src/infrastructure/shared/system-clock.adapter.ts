import { Injectable } from '@nestjs/common';
import { ClockPort } from '../../domain/shared/clock.port';

/** The only place in this codebase allowed to call `new Date()` for "now". */
@Injectable()
export class SystemClockAdapter extends ClockPort {
  now(): Date {
    return new Date();
  }
}
