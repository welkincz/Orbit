"use client";

import dynamic from "next/dynamic";
import type { PeopleDataset } from "@/types/person";

const ForceGraphCanvas = dynamic(
  () => import("./ForceGraphCanvas").then((module) => module.ForceGraphCanvas),
  { ssr: false },
);

interface NetworkGraphProps {
  dataset: PeopleDataset;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function NetworkGraph({ dataset, selectedId, onSelect }: NetworkGraphProps) {
  return (
    <section
      aria-describedby="relationship-graph-description"
      aria-label="Professional relationship graph"
      className="orbit-graph"
    >
      <p className="sr-only" id="relationship-graph-description">
        Interactive relationship map. Select a person to open their details, drag to pan, and scroll to zoom.
      </p>
      <ForceGraphCanvas dataset={dataset} onSelect={onSelect} selectedId={selectedId} />
    </section>
  );
}
