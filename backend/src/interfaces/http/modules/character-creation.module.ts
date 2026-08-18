import { Module } from '@nestjs/common';
import { FinalizeCharacterCreationUseCase } from '../../../application/character-creation/finalize-character-creation.use-case';
import { GetCharacterCreationSessionUseCase } from '../../../application/character-creation/get-character-creation-session.use-case';
import { SendCharacterCreationMessageUseCase } from '../../../application/character-creation/send-character-creation-message.use-case';
import { CharacterCreationController } from '../controllers/character-creation.controller';
import { SessionModule } from './session.module';
import { UsageQuotaModule } from './usage-quota.module';

/**
 * Owns the guided AI character-creation chat (see `PRD.md` addendum -
 * "Character creation is a guided AI conversation"): the
 * `/api/character-creation-sessions/*` endpoints, and the three use-cases
 * that read/advance/finalize a `CharacterCreationSession`.
 *
 * Imports `SessionModule` rather than redeclaring
 * `CharacterCreationSessionRepository`/`GameSystemRepository`/
 * `CharacterRepository`/`SessionPlayerRepository`/`GameSessionRepository`/
 * `LlmGameMasterPort`/`NarrateSessionOpeningUseCase` -
 * `CreateSessionUseCase`/`JoinSessionUseCase` already depend on the first of
 * those, and `SessionModule` already owns the `LLM_PROVIDER`
 * adapter-selection factory (see its doc comment) - no reason to duplicate
 * either here. `FinalizeCharacterCreationUseCase` injects both
 * `GameSessionRepository` and `NarrateSessionOpeningUseCase` from
 * `SessionModule`'s exports to fire the opening-narration best-effort
 * trigger (see that use-case's doc comment).
 */
@Module({
  imports: [SessionModule, UsageQuotaModule],
  controllers: [CharacterCreationController],
  providers: [
    GetCharacterCreationSessionUseCase,
    SendCharacterCreationMessageUseCase,
    FinalizeCharacterCreationUseCase,
  ],
})
export class CharacterCreationModule {}
