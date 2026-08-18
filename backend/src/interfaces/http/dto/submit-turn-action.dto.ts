import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitTurnActionDto {
  @IsString()
  @IsNotEmpty()
  actionText!: string;

  /**
   * Optional `GameSystem.mechanicalActions[].actionKey`, explicitly chosen
   * by the player at submission time (see `tasks/04-llm-orchestration.md` -
   * "Note UX"). Undefined/omitted means a free, non-mechanical action.
   */
  @IsOptional()
  @IsString()
  mechanicalActionKey?: string;
}
