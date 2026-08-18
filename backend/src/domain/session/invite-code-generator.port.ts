/**
 * Port (driven side) implemented by the infrastructure layer. Generates
 * short, unambiguous invite codes (avoiding characters easily confused when
 * shared verbally/by hand, e.g. `0`/`O`, `1`/`I` - see
 * `tasks/03-session-engine.md`).
 */
export abstract class InviteCodeGeneratorPort {
  abstract generate(): string;
}
