import { SessionStatus } from './session';

export interface AdminSessionParticipant {
  userId: string;
  characterName: string;
}

/** Row shape returned by `GET /api/admin/sessions` - see `AdminSessionsPage`. */
export interface AdminSessionView {
  id: string;
  name: string;
  gameSystemName: string;
  status: SessionStatus;
  currentTurnNumber: number;
  createdAt: string;
  participants: AdminSessionParticipant[];
}
