import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RejectCharacterDeltaUseCase } from '../../../application/character/reject-character-delta.use-case';
import { ValidateCharacterDeltaUseCase } from '../../../application/character/validate-character-delta.use-case';
import { CreateSessionUseCase } from '../../../application/session/create-session.use-case';
import { DeleteSoloSessionUseCase } from '../../../application/session/delete-solo-session.use-case';
import {
  DEFAULT_RECENT_TURNS_LIMIT,
  GetSessionStateUseCase,
  SessionStateView,
} from '../../../application/session/get-session-state.use-case';
import { JoinSessionUseCase } from '../../../application/session/join-session.use-case';
import {
  LeaveSessionResult,
  LeaveSessionUseCase,
} from '../../../application/session/leave-session.use-case';
import { ListSessionsForUserUseCase } from '../../../application/session/list-sessions-for-user.use-case';
import {
  SubmitTurnActionResult,
  SubmitTurnActionUseCase,
} from '../../../application/session/submit-turn-action.use-case';
import { GetOrCreateUserProfileUseCase } from '../../../application/user/get-or-create-user-profile.use-case';
import { PendingCharacterDeltaStatus } from '../../../domain/character/pending-character-delta';
import {
  GameSession,
  SessionStatus,
} from '../../../domain/session/game-session';
import { TurnResolutionDiceRoll } from '../../../domain/session/turn-resolution';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../decorators/current-user.decorator';
import { CreateSessionDto } from '../dto/create-session.dto';
import { JoinSessionDto } from '../dto/join-session.dto';
import { SubmitTurnActionDto } from '../dto/submit-turn-action.dto';
import { QuotaExceededFilter } from '../filters/quota-exceeded.filter';
import { resolveDefaultRole } from '../user-role-policy';

interface SessionResponse extends SessionSummaryResponse {
  /**
   * Id of the `CharacterCreationSession` the caller should now converse
   * with (`GET/POST /api/character-creation-sessions/:id...`) before they
   * become an active player - see `CharacterCreationController`.
   */
  characterCreationSessionId: string;
}

interface SessionSummaryResponse {
  id: string;
  gameSystemId: string;
  name: string;
  inviteCode: string;
  status: SessionStatus;
  currentTurnNumber: number;
  createdByUserId: string;
  charactersVisibleToOthers: boolean;
  createdAt: Date;
  /**
   * Proactive scene-setting narration, set once every player has finalized
   * their character (see `NarrateSessionOpeningUseCase`) - `null` until then.
   */
  openingNarrationText: string | null;
}

interface LeaveSessionResponse {
  sessionDeleted: boolean;
}

interface SubmitTurnActionResponse {
  session: SessionSummaryResponse;
  submissionId: string;
  resolved: boolean;
  narrationText: string | null;
}

interface PendingCharacterDeltaResponse {
  id: string;
  characterId: string;
  status: PendingCharacterDeltaStatus;
  hitPoints?: number;
  inventoryAdd: string[];
  inventoryRemove: string[];
  customAttributeChanges: Record<string, number | string>;
}

interface SessionStateResponse {
  session: SessionSummaryResponse;
  players: {
    userId: string;
    characterId: string;
    hasSubmittedCurrentTurn: boolean;
  }[];
  recentTurns: {
    turnNumber: number;
    narrationText: string;
    diceRolls: TurnResolutionDiceRoll[];
    pendingDeltas: PendingCharacterDeltaResponse[];
    resolvedAt: Date;
  }[];
}

function toSummaryResponse(session: GameSession): SessionSummaryResponse {
  return {
    id: session.id,
    gameSystemId: session.gameSystemId,
    name: session.name,
    inviteCode: session.inviteCode,
    status: session.status,
    currentTurnNumber: session.currentTurnNumber,
    createdByUserId: session.createdByUserId,
    charactersVisibleToOthers: session.charactersVisibleToOthers,
    createdAt: session.createdAt,
    openingNarrationText: session.openingNarrationText,
  };
}

@Controller('sessions')
export class SessionController {
  constructor(
    private readonly createSession: CreateSessionUseCase,
    private readonly joinSession: JoinSessionUseCase,
    private readonly deleteSoloSession: DeleteSoloSessionUseCase,
    private readonly leaveSession: LeaveSessionUseCase,
    private readonly submitTurnAction: SubmitTurnActionUseCase,
    private readonly getSessionState: GetSessionStateUseCase,
    private readonly listSessionsForUser: ListSessionsForUserUseCase,
    private readonly getOrCreateUserProfile: GetOrCreateUserProfileUseCase,
    private readonly validateCharacterDelta: ValidateCharacterDeltaUseCase,
    private readonly rejectCharacterDelta: RejectCharacterDeltaUseCase,
    private readonly config: ConfigService,
  ) {}

  /** "Mes parties": sessions the caller created or is seated in. */
  @Get()
  async listMine(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SessionSummaryResponse[]> {
    const sessions = await this.listSessionsForUser.execute(user.id);
    return sessions.map(toSummaryResponse);
  }

  @Post()
  async create(
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SessionResponse> {
    const profile = await this.getOrCreateUserProfile.execute(
      user.id,
      resolveDefaultRole(user.email, this.config),
    );
    const { session, characterCreationSessionId } =
      await this.createSession.execute({
        gameSystemId: dto.gameSystemId,
        name: dto.name,
        createdByUserId: user.id,
        createdByUserRole: profile.role,
        charactersVisibleToOthers: dto.charactersVisibleToOthers,
      });
    return { ...toSummaryResponse(session), characterCreationSessionId };
  }

  @Post('join')
  async join(
    @Body() dto: JoinSessionDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SessionResponse> {
    const profile = await this.getOrCreateUserProfile.execute(
      user.id,
      resolveDefaultRole(user.email, this.config),
    );
    const { session, characterCreationSessionId } =
      await this.joinSession.execute({
        inviteCode: dto.inviteCode,
        userId: user.id,
        userRole: profile.role,
      });
    return { ...toSummaryResponse(session), characterCreationSessionId };
  }

  /**
   * Permanent delete, solo sessions only (one active player, the requester
   * themself) - `DeleteSoloSessionUseCase` rejects anything else (see its
   * doc comment). Group sessions are dismantled by every player leaving
   * individually (`POST :id/leave`), which cascade-deletes on the last one.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    await this.deleteSoloSession.execute({ sessionId: id, userId: user.id });
  }

  /**
   * A player leaves a group session at any time, including mid-`resolving`
   * (leaving isn't a turn action). `sessionDeleted` tells the caller
   * whether this was the last active player, cascading the whole session
   * away - see `LeaveSessionUseCase`.
   */
  @Post(':id/leave')
  async leave(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<LeaveSessionResponse> {
    const result: LeaveSessionResult = await this.leaveSession.execute({
      sessionId: id,
      userId: user.id,
    });
    return { sessionDeleted: result.sessionDeleted };
  }

  // `QuotaExceededError` can bubble up from `ResolveSceneUseCase` (via
  // `SubmitTurnActionUseCase`) when the daily LLM quota is exhausted -
  // without this filter it would surface as an opaque 500 (see CLAUDE.md -
  // "Jamais d'appel LLM sans vérification de quota au préalable").
  @UseFilters(QuotaExceededFilter)
  @Post(':id/turns')
  async submitTurn(
    @Param('id') id: string,
    @Body() dto: SubmitTurnActionDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SubmitTurnActionResponse> {
    const result: SubmitTurnActionResult = await this.submitTurnAction.execute({
      sessionId: id,
      userId: user.id,
      actionText: dto.actionText,
      mechanicalActionKey: dto.mechanicalActionKey,
    });
    return {
      session: toSummaryResponse(result.session),
      submissionId: result.submission.id,
      resolved: result.resolution !== null,
      narrationText: result.resolution?.narrationText ?? null,
    };
  }

  /**
   * Polling endpoint - must stay lightweight regardless of turn-history
   * size (see `GetSessionStateUseCase`). `recentTurns` accepts an optional
   * override of how many past resolutions to include.
   */
  @Get(':id/state')
  async state(
    @Param('id') id: string,
    @Query('recentTurns') recentTurns?: string,
  ): Promise<SessionStateResponse> {
    const limit = recentTurns
      ? Number(recentTurns)
      : DEFAULT_RECENT_TURNS_LIMIT;
    const state: SessionStateView = await this.getSessionState.execute(
      id,
      Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_RECENT_TURNS_LIMIT,
    );
    return {
      session: toSummaryResponse(state.session),
      players: state.players,
      recentTurns: state.recentResolutions.map((resolution) => ({
        turnNumber: resolution.turnNumber,
        narrationText: resolution.narrationText,
        diceRolls: resolution.diceRolls,
        pendingDeltas: (
          state.pendingDeltasByTurn[resolution.turnNumber] ?? []
        ).map(toPendingDeltaResponse),
        resolvedAt: resolution.resolvedAt,
      })),
    };
  }

  /** Validates ("Valider") a pending LLM-proposed delta - the ONLY path that writes it to the character sheet. */
  @Post(':id/turns/:turnNumber/deltas/:deltaId/validate')
  async validateDelta(
    @Param('deltaId') deltaId: string,
  ): Promise<PendingCharacterDeltaResponse> {
    const pendingDelta = await this.validateCharacterDelta.execute(deltaId);
    return toPendingDeltaResponse(pendingDelta);
  }

  /** Rejects ("Ignorer") a pending LLM-proposed delta - never touches the character sheet. */
  @Post(':id/turns/:turnNumber/deltas/:deltaId/reject')
  async rejectDelta(
    @Param('deltaId') deltaId: string,
  ): Promise<PendingCharacterDeltaResponse> {
    const pendingDelta = await this.rejectCharacterDelta.execute(deltaId);
    return toPendingDeltaResponse(pendingDelta);
  }
}

function toPendingDeltaResponse(pendingDelta: {
  id: string;
  characterId: string;
  status: PendingCharacterDeltaStatus;
  deltaPayload: {
    hitPoints?: number;
    inventoryAdd?: string[];
    inventoryRemove?: string[];
    customAttributeChanges?: Record<string, number | string>;
  };
}): PendingCharacterDeltaResponse {
  return {
    id: pendingDelta.id,
    characterId: pendingDelta.characterId,
    status: pendingDelta.status,
    hitPoints: pendingDelta.deltaPayload.hitPoints,
    inventoryAdd: pendingDelta.deltaPayload.inventoryAdd ?? [],
    inventoryRemove: pendingDelta.deltaPayload.inventoryRemove ?? [],
    customAttributeChanges:
      pendingDelta.deltaPayload.customAttributeChanges ?? {},
  };
}
