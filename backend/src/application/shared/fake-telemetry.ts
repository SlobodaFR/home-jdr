import { Telemetry, TelemetryEvent } from '../../domain/shared/telemetry';

/** Test double for `Telemetry` - records every captured event. */
export class FakeTelemetry extends Telemetry {
  readonly captured: { event: TelemetryEvent }[] = [];

  capture(event: TelemetryEvent): void {
    this.captured.push({ event });
  }

  names(): string[] {
    return this.captured.map(({ event }) => event.name);
  }
}
