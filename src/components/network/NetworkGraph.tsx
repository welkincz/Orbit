"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  RELATIONSHIP_FILTERS,
  getRelationshipFilterIds,
  type RelationshipFilter,
} from "@/lib/graph-filters";
import { buildGraphModel, selectNeighbourhood } from "@/lib/graph-model";
import type { ISODate, PeopleDataset } from "@/types/person";
import { GraphControls } from "./GraphControls";

const ForceGraphCanvas = dynamic(
  () => import("./ForceGraphCanvas").then((module) => module.ForceGraphCanvas),
  {
    ssr: false,
    loading: () => <div aria-hidden="true" className="orbit-graph-placeholder" />,
  },
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
  onSelect,
}: NetworkGraphProps) {
  const [layoutResetToken, setLayoutResetToken] = useState(0);
  const { theme } = useTheme();

  // The corner label names what is on screen, so choosing a view or a person
  // always produces a visible confirmation somewhere on the canvas.
  const viewLabel = useMemo(() => {
    const selected = selectedId
      ? dataset.people.find((person) => person.id === selectedId)
      : undefined;

    if (selected) {
      const neighbourhood = selectNeighbourhood(
        buildGraphModel(dataset),
        dataset.selfId,
        selected.id,
      );
      return `${selected.name} · ${neighbourhood.nodes.length} people`;
    }

    if (activeFilter === "all") {
      const count = dataset.people.filter((person) => person.type === "person").length;
      return `All people · ${count}`;
    }

    const label = RELATIONSHIP_FILTERS.find(({ key }) => key === activeFilter)?.label ?? "";
    const matching = getRelationshipFilterIds(dataset.people, currentDate, activeFilter);
    return `${label} · ${matching.size}`;
  }, [activeFilter, currentDate, dataset, selectedId]);

  return (
    <section
      aria-describedby="relationship-graph-description"
      aria-label="Professional relationship graph"
      className="orbit-graph"
    >
      <p className="sr-only" id="relationship-graph-description">
        Interactive relationship map. Select a person to open their details and see their immediate
        neighbourhood, drag to pan, and scroll to zoom. Focus the map and use the arrow keys to move
        between people.
      </p>
      <p className="orbit-graph__view-label">{viewLabel}</p>
      <GraphControls onResetLayout={() => setLayoutResetToken((token) => token + 1)} />
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
