/**
 * Domain error - NOT an HTTP exception. Raised by `ResolveSceneUseCase` when
 * `UsageQuotaPort.checkQuotaAvailable()` reports the daily LLM quota is
 * exhausted. The HTTP layer (`interfaces/http/`) is responsible for
 * translating this into a clean 429 response - see
 * `tasks/08-admin-quotas-cost-guardrails.md` and `CLAUDE.md` (controllers
 * hold no business logic, including error-code decisions... except the
 * *translation* of a domain error to a status code, which does live at the
 * interfaces boundary by design).
 */
export class QuotaExceededError extends Error {
  constructor(message = 'Daily LLM quota exceeded') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}
