"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

interface GraphControlsProps {
  onResetLayout: () => void;
}

const RESET_STATUS_MESSAGE = "Layout reset.";
const RESET_STATUS_CLEAR_MS = 4000;

export function GraphControls({ onResetLayout }: GraphControlsProps) {
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
      <button className="graph-reset-button" onClick={resetLayout} type="button">
        <RotateCcw aria-hidden="true" className="icon-sm" strokeWidth={1.75} />
        Reset layout
      </button>
      <span aria-live="polite" className="graph-control-status" role="status">
        {status}
      </span>
    </div>
  );
}
