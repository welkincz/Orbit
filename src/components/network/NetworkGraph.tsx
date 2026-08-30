"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { RelationshipFilter } from "@/lib/graph-filters";
import type { ISODate, PeopleDataset } from "@/types/person";
import { RelationshipFilterBar } from "./RelationshipFilterBar";

const ForceGraphCanvas = dynamic(
  () => import("./ForceGraphCanvas").then((module) => module.ForceGraphCanvas),
  { ssr: false },
);

interface NetworkGraphProps {
  activeFilter: RelationshipFilter;
  currentDate: ISODate;
  dataset: PeopleDataset;
  selectedId: string | null;
  onFilterChange: (filter: RelationshipFilter) => void;
  onSelect: (id: string | null) => void;
}

export function NetworkGraph({
  activeFilter,
  currentDate,
  dataset,
  selectedId,
  onFilterChange,
  onSelect,
}: NetworkGraphProps) {
  const [layoutResetToken, setLayoutResetToken] = useState(0);
  const { theme } = useTheme();

  return (
    <section
      aria-describedby="relationship-graph-description"
      aria-label="Professional relationship graph"
      className="orbit-graph"
    >
      <p className="sr-only" id="relationship-graph-description">
        Interactive relationship map. Select a person to open their details, drag to pan, and scroll to zoom.
      </p>
      <RelationshipFilterBar
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        onResetLayout={() => setLayoutResetToken((token) => token + 1)}
      />
      <ForceGraphCanvas
        activeFilter={activeFilter}
        currentDate={currentDate}
        dataset={dataset}
        layoutResetToken={layoutResetToken}
        onSelect={onSelect}
        selectedId={selectedId}
        theme={theme}
      />
    </section>
  );
}
