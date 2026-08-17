export function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-lg bg-canvas">
      <div className="w-full max-w-sm flex flex-col items-center gap-xl">
        <h1 className="font-serif-display text-display-title text-ink text-center">home-jdr</h1>

        <a
          href="/api/auth/login"
          className="bg-ink text-on-primary px-xl py-md rounded-lg font-button-md text-center"
        >
          Se connecter
        </a>
      </div>
    </main>
  );
}
