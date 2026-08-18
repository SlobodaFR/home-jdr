import { randomUUID } from 'crypto';

export interface MapPinProps {
  id: string;
  worldMapId: string;
  label: string;
  /** Relative coordinates (0-1), captured from click/tap position on the rendered image - stays correct at any screen size. */
  positionX: number;
  positionY: number;
  notes: string;
  createdByUserId: string;
  createdAt: Date;
}

export type NewMapPinProps = Omit<MapPinProps, 'id' | 'notes' | 'createdAt'> & {
  id?: string;
  notes?: string;
  createdAt?: Date;
};

function assertValidPosition(
  value: number,
  axis: 'positionX' | 'positionY',
): void {
  if (value < 0 || value > 1) {
    throw new Error(`MapPin ${axis} must be between 0 and 1`);
  }
}

/**
 * A manually-placed pin/location on a `WorldMap` (see `tasks/05-world-map.md`).
 * Placement is never LLM-driven (hors perimetre explicite, PRD.md).
 */
export class MapPin {
  private readonly props: MapPinProps;

  private constructor(props: MapPinProps) {
    if (!props.worldMapId.trim()) {
      throw new Error('MapPin worldMapId is required');
    }
    if (!props.label.trim()) {
      throw new Error('MapPin label is required');
    }
    assertValidPosition(props.positionX, 'positionX');
    assertValidPosition(props.positionY, 'positionY');
    this.props = props;
  }

  static create(props: NewMapPinProps): MapPin {
    return new MapPin({
      ...props,
      id: props.id ?? randomUUID(),
      notes: props.notes ?? '',
      createdAt: props.createdAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get worldMapId(): string {
    return this.props.worldMapId;
  }

  get label(): string {
    return this.props.label;
  }

  get positionX(): number {
    return this.props.positionX;
  }

  get positionY(): number {
    return this.props.positionY;
  }

  get notes(): string {
    return this.props.notes;
  }

  get createdByUserId(): string {
    return this.props.createdByUserId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /**
   * Returns a copy with the given fields replaced (move, rename, edit
   * notes). `undefined` fields are left untouched - this supports partial
   * updates (`PATCH /pins/:id`) without accidentally clearing a field.
   */
  update(
    changes: Partial<
      Pick<MapPinProps, 'label' | 'positionX' | 'positionY' | 'notes'>
    >,
  ): MapPin {
    const definedChanges = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    return new MapPin({ ...this.props, ...definedChanges });
  }
}
