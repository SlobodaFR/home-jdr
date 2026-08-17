import { UserProfile } from './user-profile';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class UserProfileRepository {
  abstract findByUserId(userId: string): Promise<UserProfile | null>;
  abstract save(profile: UserProfile): Promise<void>;
}
