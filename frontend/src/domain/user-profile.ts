export type UserRole = 'admin' | 'adult' | 'child';

export interface UserProfile {
  userId: string;
  role: UserRole;
}
