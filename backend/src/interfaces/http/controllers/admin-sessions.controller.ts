import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  AdminSessionParticipantView,
  AdminSessionView,
  ListSessionsForAdminUseCase,
} from '../../../application/session/list-sessions-for-admin.use-case';
import { SessionStatus } from '../../../domain/session/game-session';
import { AdminRoleGuard } from '../guards/admin-role.guard';

interface AdminSessionParticipantResponse {
  userId: string;
  characterName: string;
}

interface AdminSessionResponse {
  id: string;
  name: string;
  gameSystemName: string;
  status: SessionStatus;
  currentTurnNumber: number;
  createdAt: Date;
  participants: AdminSessionParticipantResponse[];
}

function toParticipantResponse(
  participant: AdminSessionParticipantView,
): AdminSessionParticipantResponse {
  return {
    userId: participant.userId,
    characterName: participant.characterName,
  };
}

function toResponse(session: AdminSessionView): AdminSessionResponse {
  return {
    id: session.id,
    name: session.name,
    gameSystemName: session.gameSystemName,
    status: session.status,
    currentTurnNumber: session.currentTurnNumber,
    createdAt: session.createdAt,
    participants: session.participants.map(toParticipantResponse),
  };
}

/** Admin-only sessions overview - every `GameSession` in the system, see `ListSessionsForAdminUseCase`. */
@UseGuards(AdminRoleGuard)
@Controller('admin')
export class AdminSessionsController {
  constructor(
    private readonly listSessionsForAdmin: ListSessionsForAdminUseCase,
  ) {}

  @Get('sessions')
  async sessions(): Promise<AdminSessionResponse[]> {
    const sessions = await this.listSessionsForAdmin.execute();
    return sessions.map(toResponse);
  }
}
