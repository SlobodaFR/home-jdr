import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateSessionUseCase } from '../../../application/session/create-session.use-case';
import {
  DEFAULT_RECENT_TURNS_LIMIT,
  GetSessionStateUseCase,
  SessionStateView,
} from '../../../application/session/get-session-state.use-case';
import { JoinSessionUseCase } from '../../../application/session/join-session.use-case';
import { ListSessionsForUserUseCase } from '../../../application/session/list-sessions-for-user.use-case';
import {
  SubmitTurnActionResult,
  SubmitTurnActionUseCase,
} from '../../../application/session/submit-turn-action.use-case';
import { GetOrCreateUserProfileUseCase } from '../../../application/user/get-or-create-user-profile.use-case';
import {
  GameSession,
  SessionStatus,
} from '../../../domain/session/game-session';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../decorators/current-user.decorator';
import { CreateSessionDto } from '../dto/create-session.dto';
import { JoinSessionDto } from '../dto/join-session.dto';
import { SubmitTurnActionDto } from '../dto/submit-turn-action.dto';
import { resolveDefaultRole } from '../user-role-policy';

interface SessionResponse extends SessionSummaryResponse {
  characterId: string;
}

interface SessionSummaryResponse {
  id: string;
  gameSystemId: string;
  name: string;
  inviteCode: string;
  status: SessionStatus;
  currentTurnNumber: number;
  createdAt: Date;
}

interface SubmitTurnActionResponse {
  session: SessionSummaryResponse;
  submissionId: string;
  resolved: boolean;
  narrationText: string | null;
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
    createdAt: session.createdAt,
  };
}

@Controller('sessions')
export class SessionController {
  constructor(
    private readonly createSession: CreateSessionUseCase,
    private readonly joinSession: JoinSessionUseCase,
    private readonly submitTurnAction: SubmitTurnActionUseCase,
    private readonly getSessionState: GetSessionStateUseCase,
    private readonly listSessionsForUser: ListSessionsForUserUseCase,
    private readonly getOrCreateUserProfile: GetOrCreateUserProfileUseCase,
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
    const { session, character } = await this.createSession.execute({
      gameSystemId: dto.gameSystemId,
      name: dto.name,
      createdByUserId: user.id,
      createdByUserRole: profile.role,
      characterName: dto.characterName,
    });
    return { ...toSummaryResponse(session), characterId: character.id };
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
    const { session, character } = await this.joinSession.execute({
      inviteCode: dto.inviteCode,
      userId: user.id,
      userRole: profile.role,
      characterName: dto.characterName,
    });
    return { ...toSummaryResponse(session), characterId: character.id };
  }

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
        resolvedAt: resolution.resolvedAt,
      })),
    };
  }
}
