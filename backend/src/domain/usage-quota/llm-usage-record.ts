import { randomUUID } from 'crypto';

export type LlmProvider = 'claude' | 'openai';

export type LlmUsageCallType =
  'scene_resolution' | 'summary' | 'image_generation';

export interface LlmUsageRecordProps {
  id: string;
  sessionId: string;
  turnNumber: number;
  provider: LlmProvider;
  callType: LlmUsageCallType;
  occurredAt: Date;
}

export type NewLlmUsageRecordProps = Omit<LlmUsageRecordProps, 'id'> & {
  id?: string;
};

/**
 * Simple audit trail of every billed LLM call (see
 * `tasks/08-admin-quotas-cost-guardrails.md`). No token/dollar accounting in
 * V1 - just enough to gate `UsageQuotaPort.checkQuotaAvailable()` and feed
 * the admin usage dashboard. `occurredAt` is always passed in explicitly
 * (never computed with `new Date()` here) so callers stay in control of
 * "now" via `ClockPort` - see `CLAUDE.md`.
 */
export class LlmUsageRecord {
  private readonly props: LlmUsageRecordProps;

  private constructor(props: LlmUsageRecordProps) {
    this.props = props;
  }

  static create(props: NewLlmUsageRecordProps): LlmUsageRecord {
    return new LlmUsageRecord({ ...props, id: props.id ?? randomUUID() });
  }

  get id(): string {
    return this.props.id;
  }

  get sessionId(): string {
    return this.props.sessionId;
  }

  get turnNumber(): number {
    return this.props.turnNumber;
  }

  get provider(): LlmProvider {
    return this.props.provider;
  }

  get callType(): LlmUsageCallType {
    return this.props.callType;
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }
}
