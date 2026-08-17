import { useEffect, useState } from 'react';
import { UserProfile } from '../../domain/user-profile';
import { apiClient } from '../../infrastructure/api-client';

interface UseUserProfileResult {
  profile: UserProfile | null;
  loading: boolean;
}

/** Fetches (and bootstraps, on first call - see backend AdminRoleGuard) the caller's role. */
export function useUserProfile(): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .fetchMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  return { profile, loading };
}
