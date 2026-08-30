import { RefreshPeopleButton } from "@/components/network/RefreshPeopleButton";
import type { PeopleDataError } from "@/lib/people";

interface DataErrorViewProps {
  error: PeopleDataError;
}

export function DataErrorView({ error }: DataErrorViewProps) {
  const groups = error.groups;
  const fileCount = groups.filter((group) => group.sourceRelativePath).length;

  return (
    <main className="error-shell">
      <section aria-labelledby="data-error-heading" className="error-ledger">
        <h1 id="data-error-heading" className="error-ledger__heading">
          Couldn&apos;t load your network
        </h1>
        <p className="error-ledger__intro">
          {fileCount > 1
            ? `Check the ${fileCount} files below and try again.`
            : "Check the people data below and try again."}
        </p>

        {groups.map((group, index) => (
          <div className="error-ledger__group" key={group.sourceRelativePath ?? `group-${index}`}>
            {group.sourceRelativePath ? (
              <p className="error-ledger__source">{group.sourceRelativePath}</p>
            ) : null}

            <ul className="error-ledger__issues">
              {group.issues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          </div>
        ))}

        <div className="error-ledger__action">
          <RefreshPeopleButton label="Retry" />
        </div>
      </section>
    </main>
  );
}
