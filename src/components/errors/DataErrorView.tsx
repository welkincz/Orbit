import { RefreshPeopleButton } from "@/components/network/RefreshPeopleButton";
import type { PeopleDataError } from "@/lib/people";

interface DataErrorViewProps {
  error: PeopleDataError;
}

export function DataErrorView({ error }: DataErrorViewProps) {
  return (
    <main className="error-shell">
      <section aria-labelledby="data-error-heading" className="error-ledger">
        <h1 id="data-error-heading" className="error-ledger__heading">
          Couldn&apos;t load your network
        </h1>
        <p className="error-ledger__intro">
          Check the people data below and try again.
        </p>

        {error.sourceRelativePath ? (
          <p className="error-ledger__source">
            {error.sourceRelativePath}
          </p>
        ) : null}

        <ul className="error-ledger__issues list-disc">
          {error.issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>

        <div className="error-ledger__action">
          <RefreshPeopleButton label="Retry" />
        </div>
      </section>
    </main>
  );
}
