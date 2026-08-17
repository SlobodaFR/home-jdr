import { useUserProfile } from './useUserProfile';

/** Gates the admin catalog screens - a single admin account in practice (see PRD.md). */
export function RequireAdmin({ children }: { children: JSX.Element }) {
  const { profile, loading } = useUserProfile();

  if (loading) {
    return <div className="px-lg py-section text-center text-mute font-body-md">Chargement...</div>;
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="px-lg py-section text-center text-mute font-body-md">
        Cet écran est réservé à l&apos;administrateur.
      </div>
    );
  }

  return children;
}
