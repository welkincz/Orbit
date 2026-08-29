"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { NetworkGraph } from "@/components/network/NetworkGraph";
import { RefreshPeopleButton } from "@/components/network/RefreshPeopleButton";
import { PersonDetail } from "@/components/people/PersonDetail";
import { RelationshipSidebar } from "@/components/people/RelationshipSidebar";
import { SearchCommand } from "@/components/search/SearchCommand";
import type { RelationshipFilter } from "@/lib/graph-filters";
import type { ISODate, PeopleDataset } from "@/types/person";

interface NetworkWorkspaceProps {
  initialDataset: PeopleDataset;
  currentDate: ISODate;
}

export function NetworkWorkspace({ initialDataset, currentDate }: NetworkWorkspaceProps) {
  const loadedPeopleCount = initialDataset.people.length;
  const [selection, setSelection] = useState({ dataset: initialDataset, selectedId: null as string | null });
  const [activeFilter, setActiveFilter] = useState<RelationshipFilter>("all");
  const selectedId = selection.dataset === initialDataset
    || initialDataset.people.some((person) => person.id === selection.selectedId)
    ? selection.selectedId
    : null;
  if (selection.dataset !== initialDataset) {
    setSelection({ dataset: initialDataset, selectedId });
  }
  const reduceMotion = useReducedMotion();
  const selectPerson = useCallback(
    (id: string | null) => setSelection({ dataset: initialDataset, selectedId: id }),
    [initialDataset],
  );
  const selectedPerson = useMemo(
    () => initialDataset.people.find((person) => person.id === selectedId),
    [initialDataset.people, selectedId],
  );

  return (
    <main className="orbit-shell">
      <header className="orbit-header">
        <div className="orbit-brand">
          <h1 className="orbit-title">Orbit</h1>
          <p className="orbit-count">
            {loadedPeopleCount} {loadedPeopleCount === 1 ? "person" : "people"} loaded
          </p>
        </div>
        <div className="orbit-actions">
          <SearchCommand people={initialDataset.people} onSelect={selectPerson} />
          <RefreshPeopleButton />
        </div>
      </header>

      <div className={`orbit-workspace${selectedPerson ? " has-detail" : ""}`}>
        <RelationshipSidebar
          currentDate={currentDate}
          dataset={initialDataset}
          onSelect={selectPerson}
          selectedId={selectedId}
        />
        <NetworkGraph
          activeFilter={activeFilter}
          currentDate={currentDate}
          dataset={initialDataset}
          onFilterChange={setActiveFilter}
          onSelect={selectPerson}
          selectedId={selectedId}
        />
        <AnimatePresence initial={false}>
          {selectedPerson && (
            <motion.div
              animate={{
                opacity: 1,
                x: 0,
                transition: { duration: reduceMotion ? 0.001 : 0.22, ease: [0.22, 1, 0.36, 1] },
              }}
              className="orbit-detail-motion"
              exit={{
                opacity: 0,
                x: reduceMotion ? 0 : 16,
                transition: { duration: reduceMotion ? 0.001 : 0.18, ease: [0.22, 1, 0.36, 1] },
              }}
              initial={{ opacity: reduceMotion ? 0 : 0.01, x: reduceMotion ? 0 : 16 }}
              key="person-detail"
            >
              <PersonDetail
                onClose={() => selectPerson(null)}
                onSelectPerson={selectPerson}
                people={initialDataset.people}
                person={selectedPerson}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
