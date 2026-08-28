import { RefreshPeopleButton } from "@/components/network/RefreshPeopleButton";
import type { ISODate, PeopleDataset } from "@/types/person";

interface NetworkWorkspaceProps {
  initialDataset: PeopleDataset;
  currentDate: ISODate;
}

export function NetworkWorkspace({ initialDataset, currentDate }: NetworkWorkspaceProps) {
  const loadedPeopleCount = initialDataset.people.length;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Orbit</h1>
          <p className="mt-2 text-sm text-slate-600">
            {loadedPeopleCount} {loadedPeopleCount === 1 ? "person" : "people"} loaded
          </p>
        </div>
        <RefreshPeopleButton />
      </header>

      <section
        aria-label="Relationship graph"
        className="min-h-96 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600"
      >
        Relationship graph for {currentDate} will appear here.
      </section>
    </main>
  );
}
