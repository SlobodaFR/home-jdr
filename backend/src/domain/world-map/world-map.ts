import { randomUUID } from 'crypto';

export interface WorldMapProps {
  id: string;
  sessionId: string;
  /** Object-storage key (MinIO) - the raw third-party generation URL is never persisted, see PRD.md. */
  imageStorageKey: string;
  /** Prompt sent to the image generator, kept for traceability/regeneration. */
  generationPrompt: string;
  createdAt: Date;
}

export type NewWorldMapProps = Omit<WorldMapProps, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: Date;
};

/**
 * A generated world-map image for a `GameSession` (see `tasks/05-world-map.md`).
 * One map per session in V1 - regenerating reuses the same `id` so existing
 * `MapPin`s stay correctly linked via `worldMapId`.
 */
export class WorldMap {
  private readonly props: WorldMapProps;

  private constructor(props: WorldMapProps) {
    if (!props.sessionId.trim()) {
      throw new Error('WorldMap sessionId is required');
    }
    if (!props.imageStorageKey.trim()) {
      throw new Error('WorldMap imageStorageKey is required');
    }
    this.props = props;
  }

  static create(props: NewWorldMapProps): WorldMap {
    return new WorldMap({
      ...props,
      id: props.id ?? randomUUID(),
      createdAt: props.createdAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get sessionId(): string {
    return this.props.sessionId;
  }

  get imageStorageKey(): string {
    return this.props.imageStorageKey;
  }

  get generationPrompt(): string {
    return this.props.generationPrompt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
