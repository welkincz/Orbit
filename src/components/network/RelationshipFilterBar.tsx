"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  RELATIONSHIP_FILTERS,
  type RelationshipFilter,
} from "@/lib/graph-filters";

interface RelationshipFilterBarProps {
  activeFilter: RelationshipFilter;
  onFilterChange: (filter: RelationshipFilter) => void;
  onResetLayout: () => void;
}

export function RelationshipFilterBar({
  activeFilter,
  onFilterChange,
  onResetLayout,
}: RelationshipFilterBarProps) {
  const [resetStatus, setResetStatus] = useState("");

  function resetLayout() {
    onResetLayout();
    setResetStatus("Layout reset.");
  }

  return (
    <div className="graph-controls">
      <div aria-label="Relationship view" className="graph-filter-bar" role="group">
        {RELATIONSHIP_FILTERS.map(({ key, label }) => (
          <button
            aria-pressed={activeFilter === key}
            className="graph-filter-button"
            key={key}
            onClick={() => onFilterChange(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <button className="graph-reset-button" onClick={resetLayout} type="button">
        <RotateCcw aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
        Reset layout
      </button>
      <span aria-live="polite" className="graph-control-status">{resetStatus}</span>
    </div>
  );
}
