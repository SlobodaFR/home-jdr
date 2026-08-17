import { useAuth } from '../auth/AuthProvider';

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-canvas px-lg py-section">
      <div className="flex items-center justify-between mb-xl">
        <h1 className="font-sans-ui text-heading-xl text-ink">Mes parties</h1>
        <button
          onClick={() => void logout()}
          className="border border-hairline text-ink px-lg py-sm rounded-lg font-button-sm"
        >
          Se déconnecter
        </button>
      </div>
      <p className="font-body-md text-ash">Connecté en tant que {user?.name}.</p>
    </main>
  );
}
