/**
 * Port (driven side) abstracting "now". Domain/application code that needs
 * the current instant (e.g. to compute a day boundary for the LLM usage
 * quota - see `tasks/08-admin-quotas-cost-guardrails.md`) depends on this
 * instead of calling `new Date()` directly, so tests can control time
 * deterministically (mirrors the explicit `now` parameter pattern used by
 * `Character.fromSchema` - see `CLAUDE.md`).
 */
export abstract class ClockPort {
  abstract now(): Date;
}
