"use client";

import { useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import type { PeopleDiagnostic } from "@/types/person";

interface DataWarningsProps {
  diagnostics: PeopleDiagnostic[];
}

export function DataWarnings({ diagnostics }: DataWarningsProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || diagnostics.length === 0) return null;

  return (
    <section aria-label="Data warnings" className="data-warnings">
      <TriangleAlert aria-hidden="true" className="icon-sm data-warnings__icon" strokeWidth={1.75} />
      <ul className="data-warnings__list">
        {diagnostics.map((diagnostic) => (
          <li key={`${diagnostic.code}:${diagnostic.sourceRelativePath ?? ""}:${diagnostic.message}`}>
            {diagnostic.message}
            {diagnostic.sourceRelativePath && (
              <span className="data-warnings__source">{diagnostic.sourceRelativePath}</span>
            )}
          </li>
        ))}
      </ul>
      <button
        aria-label="Dismiss data warnings"
        className="icon-button data-warnings__dismiss"
        onClick={() => setDismissed(true)}
        type="button"
      >
        <X aria-hidden="true" className="icon-sm" strokeWidth={1.75} />
      </button>
    </section>
  );
}
