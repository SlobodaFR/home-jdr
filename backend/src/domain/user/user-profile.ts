export type UserRole = 'admin' | 'adult' | 'child';

export interface UserProfileProps {
  userId: string;
  role: UserRole;
}

const VALID_ROLES: UserRole[] = ['admin', 'adult', 'child'];

/**
 * home-jdr-local mirror of a concern home-auth does not expose today: the
 * family role (admin/adult/child) used to gate the game catalog and, later,
 * session creation (see tasks/01-game-catalog.md - "Détail - contrôle
 * d'accès admin"). Keyed by the home-auth user id so it can be dropped
 * trivially once/if home-auth grows a native role claim.
 */
export class UserProfile {
  private readonly props: UserProfileProps;

  private constructor(props: UserProfileProps) {
    if (!VALID_ROLES.includes(props.role)) {
      throw new Error(`Unknown role: ${String(props.role)}`);
    }
    this.props = props;
  }

  static create(props: UserProfileProps): UserProfile {
    return new UserProfile(props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get role(): UserRole {
    return this.props.role;
  }

  withRole(role: UserRole): UserProfile {
    return new UserProfile({ ...this.props, role });
  }
}
