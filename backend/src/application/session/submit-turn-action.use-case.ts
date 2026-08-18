import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GameSession } from '../../domain/session/game-session';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SceneResolverPort } from '../../domain/session/scene-resolver.port';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { TurnResolution } from '../../domain/session/turn-resolution';
import { TurnResolutionRepository } from '../../domain/session/turn-resolution.repository';
import { TurnSubmission } from '../../domain/session/turn-submission';
import { TurnSubmissionRepository } from '../../domain/session/turn-submission.repository';

export interface SubmitTurnActionInput {
  sessionId: string;
  userId: string;
  actionText: string;
}

export interface SubmitTurnActionResult {
  session: GameSession;
  submission: TurnSubmission;
  /** Non-null only when this submission was the one that triggered resolution. */
  resolution: TurnResolution | null;
}

/**
 * Adds a player's action to the current turn. Resolution (even the stub
 * `SceneResolverPort`) triggers if and only if every active `SessionPlayer`
 * of the session has submitted for the current turn - a solo (1-player)
 * session therefore resolves immediately on its only submission, while a
 * group session waits for the last player. See `PRD.md` - "Tour de jeu =
 * soumission groupée" / "Solo = cas particulier du multi".
 *
 * Idempotence: re-submitting for a turn the caller already submitted
 * returns the existing submission instead of creating a duplicate row or
 * re-triggering resolution (see `CLAUDE.md` - "Idempotence des appels de
 * résolution de scène").
 */
@Injectable()
export class SubmitTurnActionUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly turnSubmissionRepository: TurnSubmissionRepository,
    private readonly turnResolutionRepository: TurnResolutionRepository,
    private readonly sceneResolver: SceneResolverPort,
  ) {}

  async execute(input: SubmitTurnActionInput): Promise<SubmitTurnActionResult> {
    let session = await this.gameSessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const player = await this.sessionPlayerRepository.findBySessionAndUser(
      session.id,
      input.userId,
    );
    if (!player) {
      throw new ForbiddenException(
        'Only players of this session can submit a turn action',
      );
    }

    if (session.status === 'resolving') {
      throw new ConflictException(
        'The scene is currently being resolved, try again shortly',
      );
    }

    if (session.status === 'narrating') {
      session = session.startNextTurn();
      await this.gameSessionRepository.save(session);
    }

    const existingSubmissions =
      await this.turnSubmissionRepository.findBySessionAndTurn(
        session.id,
        session.currentTurnNumber,
      );

    const alreadySubmitted = existingSubmissions.find(
      (submission) => submission.playerId === input.userId,
    );
    if (alreadySubmitted) {
      return { session, submission: alreadySubmitted, resolution: null };
    }

    const submission = TurnSubmission.create({
      sessionId: session.id,
      turnNumber: session.currentTurnNumber,
      playerId: input.userId,
      actionText: input.actionText,
    });
    await this.turnSubmissionRepository.save(submission);

    const activePlayers = await this.sessionPlayerRepository.findBySessionId(
      session.id,
    );
    const allSubmissions = [...existingSubmissions, submission];
    const everyoneHasSubmitted = activePlayers.every((activePlayer) =>
      allSubmissions.some(
        (turnSubmission) => turnSubmission.playerId === activePlayer.userId,
      ),
    );

    if (!everyoneHasSubmitted) {
      return { session, submission, resolution: null };
    }

    session = session.beginResolving();
    await this.gameSessionRepository.save(session);

    const result = await this.sceneResolver.resolve(session, allSubmissions);

    const resolution = TurnResolution.create({
      sessionId: session.id,
      turnNumber: session.currentTurnNumber,
      narrationText: result.narrationText,
    });
    await this.turnResolutionRepository.save(resolution);

    session = session.completeResolution();
    await this.gameSessionRepository.save(session);

    return { session, submission, resolution };
  }
}
