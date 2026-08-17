import { randomUUID } from 'crypto';
import {
  CharacterSheetSchema,
  validateCharacterSheetSchema,
} from './character-sheet-schema';
import {
  MechanicalAction,
  validateMechanicalActions,
} from './mechanical-action';

export interface GameSystemProps {
  id: string;
  name: string;
  description: string;
  adaptedForChildren: boolean;
  rulesText: string;
  rulesSourceFileName: string;
  characterSheetSchema: CharacterSheetSchema;
  mechanicalActions: MechanicalAction[];
  createdAt: Date;
}

export type NewGameSystemProps = Omit<GameSystemProps, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: Date;
};

/**
 * A JdR (game system) as catalogued by the admin: the extracted rules text
 * (injected in full in the LLM system prompt - see PRD.md, no RAG in V1),
 * the structured character sheet schema and the list of mechanical actions
 * that trigger a dice roll.
 */
export class GameSystem {
  private readonly props: GameSystemProps;

  private constructor(props: GameSystemProps) {
    const name = props.name.trim();
    if (!name) {
      throw new Error('GameSystem name is required');
    }
    validateCharacterSheetSchema(props.characterSheetSchema);
    validateMechanicalActions(props.mechanicalActions);
    this.props = { ...props, name };
  }

  static create(props: NewGameSystemProps): GameSystem {
    return new GameSystem({
      ...props,
      id: props.id ?? randomUUID(),
      createdAt: props.createdAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get adaptedForChildren(): boolean {
    return this.props.adaptedForChildren;
  }

  get rulesText(): string {
    return this.props.rulesText;
  }

  get rulesSourceFileName(): string {
    return this.props.rulesSourceFileName;
  }

  get characterSheetSchema(): CharacterSheetSchema {
    return this.props.characterSheetSchema;
  }

  get mechanicalActions(): MechanicalAction[] {
    return this.props.mechanicalActions;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Returns a copy with the given fields replaced. Used by the update use-case. */
  update(
    changes: Partial<Omit<GameSystemProps, 'id' | 'createdAt'>>,
  ): GameSystem {
    return new GameSystem({ ...this.props, ...changes });
  }
}
