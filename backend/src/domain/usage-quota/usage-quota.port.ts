import { LlmProvider, LlmUsageCallType } from './llm-usage-record';

export interface RecordLlmUsageInput {
  sessionId: string;
  turnNumber: number;
  provider: LlmProvider;
  callType: LlmUsageCallType;
}

/**
 * Port (driven side) implemented by the infrastructure layer
 * (`TypeOrmUsageQuotaAdapter`). `ResolveSceneUseCase` calls
 * `checkQuotaAvailable()` before making any `LlmGameMasterPort`/
 * `DiceRollerPort` call, and `recordUsage()` after a successful billed call
 * (also called from `MaintainRollingSummaryUseCase` for `summary` calls) -
 * see `tasks/08-admin-quotas-cost-guardrails.md` and `CLAUDE.md` -
 * "Jamais d'appel LLM sans vérification de quota au préalable".
 */
export abstract class UsageQuotaPort {
  abstract checkQuotaAvailable(): Promise<boolean>;
  abstract recordUsage(record: RecordLlmUsageInput): Promise<void>;
}
