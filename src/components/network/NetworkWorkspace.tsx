"use client";

import { useCallback, useMemo, useState } from "react";
import { NetworkGraph } from "@/components/network/NetworkGraph";
import { RefreshPeopleButton } from "@/components/network/RefreshPeopleButton";
import { PersonDetail } from "@/components/people/PersonDetail";
import { RelationshipSidebar } from "@/components/people/RelationshipSidebar";
import { SearchCommand } from "@/components/search/SearchCommand";
import type { ISODate, PeopleDataset } from "@/types/person";

interface NetworkWorkspaceProps {
  initialDataset: PeopleDataset;
  currentDate: ISODate;
}

export function NetworkWorkspace({ initialDataset, currentDate }: NetworkWorkspaceProps) {
  const loadedPeopleCount = initialDataset.people.length;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectPerson = useCallback((id: string | null) => setSelectedId(id), []);
  const selectedPerson = useMemo(
    () => initialDataset.people.find((person) => person.id === selectedId),
    [initialDataset.people, selectedId],
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Orbit</h1>
          <p className="mt-2 text-sm text-slate-600">
            {loadedPeopleCount} {loadedPeopleCount === 1 ? "person" : "people"} loaded
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SearchCommand people={initialDataset.people} onSelect={selectPerson} />
          <RefreshPeopleButton />
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <RelationshipSidebar
          currentDate={currentDate}
          dataset={initialDataset}
          onSelect={selectPerson}
          selectedId={selectedId}
        />
        <NetworkGraph
          dataset={initialDataset}
          onSelect={selectPerson}
          selectedId={selectedId}
        />
        {selectedPerson && (
          <PersonDetail
            onClose={() => setSelectedId(null)}
            onSelectPerson={selectPerson}
            people={initialDataset.people}
            person={selectedPerson}
          />
        )}
      </div>
    </main>
  );
}
