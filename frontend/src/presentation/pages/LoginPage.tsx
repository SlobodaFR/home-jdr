import { useSearchParams } from 'react-router-dom';
import { ButtonPrimary } from '../components/ButtonPrimary';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const loggedOut = searchParams.get('logged_out') === '1';

  return (
    <main className="min-h-screen flex items-center justify-center px-lg bg-canvas">
      <div className="w-full max-w-sm flex flex-col items-center gap-xl">
        <h1 className="font-serif-display text-display-title text-ink text-center">
          home-jdr
        </h1>

        {loggedOut && (
          <p
            role="status"
            className="font-sans-body text-body-md text-mute text-center"
          >
            Vous avez été déconnecté.
          </p>
        )}

        <ButtonPrimary href="/api/auth/login" className="w-full text-center">
          Se connecter
        </ButtonPrimary>
      </div>
    </main>
  );
}
