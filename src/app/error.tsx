"use client";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps) {
  const message = error.message.trim() || "An unexpected error stopped Orbit from rendering.";

  return (
    <main className="error-shell">
      <section aria-labelledby="app-error-heading" className="error-ledger">
        <h1 className="error-ledger__heading" id="app-error-heading">
          Something went wrong
        </h1>
        <p className="error-ledger__intro">
          Your Markdown records were not changed. Try again, and reload the page if the problem persists.
        </p>

        <ul className="error-ledger__issues">
          <li>{message}</li>
        </ul>

        <div className="error-ledger__action">
          <button className="orbit-control" onClick={reset} type="button">
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
