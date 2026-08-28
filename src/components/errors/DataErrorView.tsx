import { RefreshPeopleButton } from "@/components/network/RefreshPeopleButton";
import type { PeopleDataError } from "@/lib/people";

interface DataErrorViewProps {
  error: PeopleDataError;
}

export function DataErrorView({ error }: DataErrorViewProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-10">
      <section aria-labelledby="data-error-heading" className="w-full rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 id="data-error-heading" className="text-2xl font-semibold text-slate-950">
          Couldn&apos;t load your network
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          Check the people data below and try again.
        </p>

        {error.sourceRelativePath ? (
          <p className="mt-5 rounded bg-white px-3 py-2 font-mono text-sm text-slate-900">
            {error.sourceRelativePath}
          </p>
        ) : null}

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-800">
          {error.issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>

        <div className="mt-6">
          <RefreshPeopleButton label="Retry" />
        </div>
      </section>
    </main>
  );
}
