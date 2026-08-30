"use client";

import { useEffect, useRef, useState } from "react";
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

const RESET_STATUS_MESSAGE = "Layout reset.";
const RESET_STATUS_CLEAR_MS = 4000;

export function RelationshipFilterBar({
  activeFilter,
  onFilterChange,
  onResetLayout,
}: RelationshipFilterBarProps) {
  const [status, setStatus] = useState("");
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (announceTimer.current !== null) clearTimeout(announceTimer.current);
    if (clearTimer.current !== null) clearTimeout(clearTimer.current);
  }, []);

  function resetLayout() {
    onResetLayout();
    if (announceTimer.current !== null) clearTimeout(announceTimer.current);
    if (clearTimer.current !== null) clearTimeout(clearTimer.current);

    // Blank the live region first: assistive tech stays silent when a repeated
    // reset re-renders the same text, so the text has to actually change.
    setStatus("");
    announceTimer.current = setTimeout(() => {
      setStatus(RESET_STATUS_MESSAGE);
      clearTimer.current = setTimeout(() => setStatus(""), RESET_STATUS_CLEAR_MS);
    }, 0);
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
      <span aria-live="polite" className="graph-control-status" role="status">
        {status}
      </span>
    </div>
  );
}
