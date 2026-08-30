"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DataWarnings } from "@/components/errors/DataWarnings";
import { NetworkGraph } from "@/components/network/NetworkGraph";
import { RefreshPeopleButton } from "@/components/network/RefreshPeopleButton";
import { PersonDetail } from "@/components/people/PersonDetail";
import { RelationshipSidebar } from "@/components/people/RelationshipSidebar";
import { SearchCommand } from "@/components/search/SearchCommand";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  MIN_DETAIL_WIDTH,
  createBrowserDetailSizeEnvironment,
  createDetailSizeStore,
  type DetailSize,
} from "@/lib/detail-size-store";
import type { RelationshipFilter } from "@/lib/graph-filters";
import type { ISODate, PeopleDataset } from "@/types/person";

interface NetworkWorkspaceProps {
  initialDataset: PeopleDataset;
  currentDate: ISODate;
}

const DEFAULT_VIEWPORT_WIDTH = 1280;

function readViewportWidth(): number {
  return typeof window === "undefined" ? DEFAULT_VIEWPORT_WIDTH : window.innerWidth;
}

function subscribeToViewportWidth(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
}

function maxDetailWidth(workspaceWidth: number): number {
  if (workspaceWidth >= 1280) {
    return Math.max(MIN_DETAIL_WIDTH, workspaceWidth - 236 - 420);
  }
  const reservedWidth = workspaceWidth <= 899 ? 16 : 236;
  return Math.max(MIN_DETAIL_WIDTH, workspaceWidth - reservedWidth);
}

function clampDetailWidth(width: number, workspaceWidth: number): number {
  return Math.round(Math.max(MIN_DETAIL_WIDTH, Math.min(width, maxDetailWidth(workspaceWidth))));
}

function formatClockTime(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return "unknown time";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(parsed);
}

export function NetworkWorkspace({ initialDataset, currentDate }: NetworkWorkspaceProps) {
  const loadedPeopleCount = initialDataset.people.length;
  const loadedAtLabel = useMemo(
    () => formatClockTime(initialDataset.loadedAt),
    [initialDataset.loadedAt],
  );
  const [selection, setSelection] = useState({ dataset: initialDataset, selectedId: null as string | null });
  const [activeFilter, setActiveFilter] = useState<RelationshipFilter>("all");
  const workspaceRef = useRef<HTMLDivElement>(null);
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

  const getWorkspaceWidth = useCallback(
    () => workspaceRef.current?.clientWidth || window.innerWidth,
    [],
  );

  const [detailSizeStore] = useState(
    () => createDetailSizeStore(createBrowserDetailSizeEnvironment()),
  );
  const detailSize = useSyncExternalStore(
    detailSizeStore.subscribe,
    detailSizeStore.getSnapshot,
    detailSizeStore.getServerSnapshot,
  );
  const viewportWidth = useSyncExternalStore(
    subscribeToViewportWidth,
    readViewportWidth,
    () => DEFAULT_VIEWPORT_WIDTH,
  );
  const effectiveDetailWidth = clampDetailWidth(detailSize.width, viewportWidth);
  const effectiveMaxDetailWidth = maxDetailWidth(viewportWidth);

  const saveDetailSize = useCallback(
    (next: DetailSize, options?: { persist?: boolean }) => detailSizeStore.setSize(next, options),
    [detailSizeStore],
  );

  const resizeDetail = useCallback((width: number, options?: { persist?: boolean }) => {
    const nextWidth = clampDetailWidth(width, getWorkspaceWidth());
    saveDetailSize({ expanded: false, restoreWidth: nextWidth, width: nextWidth }, options);
  }, [getWorkspaceWidth, saveDetailSize]);

  const commitDetailSize = useCallback(() => detailSizeStore.commit(), [detailSizeStore]);

  const resetDetailWidth = useCallback(() => {
    saveDetailSize({
      expanded: false,
      restoreWidth: MIN_DETAIL_WIDTH,
      width: MIN_DETAIL_WIDTH,
    });
  }, [saveDetailSize]);

  const toggleDetailExpanded = useCallback(() => {
    const workspaceWidth = getWorkspaceWidth();
    if (detailSize.expanded) {
      const restoredWidth = clampDetailWidth(detailSize.restoreWidth, workspaceWidth);
      saveDetailSize({ expanded: false, restoreWidth: restoredWidth, width: restoredWidth });
      return;
    }
    const expandedWidth = clampDetailWidth(workspaceWidth / 2, workspaceWidth);
    saveDetailSize({ expanded: true, restoreWidth: detailSize.width, width: expandedWidth });
  }, [detailSize, getWorkspaceWidth, saveDetailSize]);

  const closeDetail = useCallback(() => {
    // Hand focus back to the row that opened the panel so Escape is not a dead end.
    const originatingRow = selectedId
      ? workspaceRef.current?.querySelector<HTMLElement>(`[data-person-id="${CSS.escape(selectedId)}"]`)
      : null;
    selectPerson(null);
    originatingRow?.focus();
  }, [selectPerson, selectedId]);

  useEffect(() => {
    if (!selectedId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Radix owns Escape while the command palette is open.
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      closeDetail();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDetail, selectedId]);

  const workspaceStyle = { "--detail-width": `${effectiveDetailWidth}px` } as CSSProperties;

  return (
    <main className="orbit-shell">
      <header className="orbit-header">
        <div className="orbit-brand">
          <h1 className="orbit-title">Orbit</h1>
          <p className="orbit-count">
            {loadedPeopleCount} {loadedPeopleCount === 1 ? "person" : "people"} loaded
          </p>
          <time
            className="orbit-count orbit-loaded-at"
            dateTime={initialDataset.loadedAt}
            data-testid="orbit-loaded-at"
            suppressHydrationWarning
            title={`Markdown last read at ${loadedAtLabel}`}
          >
            Read {loadedAtLabel}
          </time>
        </div>
        <div className="orbit-actions">
          <SearchCommand people={initialDataset.people} onSelect={selectPerson} />
          <RefreshPeopleButton />
          <ThemeToggle />
        </div>
      </header>

      <DataWarnings diagnostics={initialDataset.diagnostics} />

      <div
        className={`orbit-workspace${selectedPerson ? " has-detail" : ""}${detailSize.expanded ? " has-detail-expanded" : ""}`}
        ref={workspaceRef}
        style={workspaceStyle}
      >
        <RelationshipSidebar
          activeFilter={activeFilter}
          currentDate={currentDate}
          dataset={initialDataset}
          onFilterChange={setActiveFilter}
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
                detailMaxWidth={effectiveMaxDetailWidth}
                detailWidth={effectiveDetailWidth}
                expanded={detailSize.expanded}
                onClose={closeDetail}
                onResetWidth={resetDetailWidth}
                onResize={resizeDetail}
                onResizeCommit={commitDetailSize}
                onSelectPerson={selectPerson}
                onToggleExpanded={toggleDetailExpanded}
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
