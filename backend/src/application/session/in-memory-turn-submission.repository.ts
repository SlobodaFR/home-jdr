import { TurnSubmission } from '../../domain/session/turn-submission';
import { TurnSubmissionRepository } from '../../domain/session/turn-submission.repository';

/** Test double shared by the session use-case specs. */
export class InMemoryTurnSubmissionRepository extends TurnSubmissionRepository {
  constructor(private submissions: TurnSubmission[] = []) {
    super();
  }

  findBySessionAndTurn(
    sessionId: string,
    turnNumber: number,
  ): Promise<TurnSubmission[]> {
    return Promise.resolve(
      this.submissions.filter(
        (s) => s.sessionId === sessionId && s.turnNumber === turnNumber,
      ),
    );
  }

  save(submission: TurnSubmission): Promise<void> {
    this.submissions = [
      ...this.submissions.filter((s) => s.id !== submission.id),
      submission,
    ];
    return Promise.resolve();
  }
}
