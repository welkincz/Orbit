"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DataWarnings } from "@/components/errors/DataWarnings";
import { NetworkGraph } from "@/components/network/NetworkGraph";
import { RefreshPeopleButton } from "@/components/network/RefreshPeopleButton";
import { PersonDetail } from "@/components/people/PersonDetail";
import { RelationshipSidebar } from "@/components/people/RelationshipSidebar";
import { SearchCommand } from "@/components/search/SearchCommand";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { RelationshipFilter } from "@/lib/graph-filters";
import type { ISODate, PeopleDataset } from "@/types/person";

interface NetworkWorkspaceProps {
  initialDataset: PeopleDataset;
  currentDate: ISODate;
}

const DETAIL_WIDTH_STORAGE_KEY = "orbit.detail-width.v1";
const DETAIL_WIDTH_CHANGE_EVENT = "orbit:detail-width-change";
const DEFAULT_DETAIL_WIDTH = 368;
const DEFAULT_VIEWPORT_WIDTH = 1280;

interface DetailSize {
  expanded: boolean;
  restoreWidth: number;
  width: number;
}

const DEFAULT_DETAIL_SIZE: DetailSize = {
  expanded: false,
  restoreWidth: DEFAULT_DETAIL_WIDTH,
  width: DEFAULT_DETAIL_WIDTH,
};
const DEFAULT_DETAIL_SIZE_SNAPSHOT = JSON.stringify(DEFAULT_DETAIL_SIZE);
let fallbackDetailSizeSnapshot = DEFAULT_DETAIL_SIZE_SNAPSHOT;
let detailStorageUnavailable = false;

function readDetailSizeSnapshot(): string {
  if (typeof window === "undefined") return DEFAULT_DETAIL_SIZE_SNAPSHOT;
  if (detailStorageUnavailable) return fallbackDetailSizeSnapshot;
  try {
    return window.localStorage.getItem(DETAIL_WIDTH_STORAGE_KEY) ?? DEFAULT_DETAIL_SIZE_SNAPSHOT;
  } catch {
    return fallbackDetailSizeSnapshot;
  }
}

function subscribeToDetailSize(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(DETAIL_WIDTH_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(DETAIL_WIDTH_CHANGE_EVENT, onStoreChange);
  };
}

function writeDetailSizeSnapshot(next: DetailSize): void {
  const snapshot = JSON.stringify(next);
  fallbackDetailSizeSnapshot = snapshot;
  try {
    window.localStorage.setItem(DETAIL_WIDTH_STORAGE_KEY, snapshot);
    detailStorageUnavailable = false;
  } catch {
    detailStorageUnavailable = true;
    // The in-memory snapshot keeps resizing usable when storage is unavailable.
  }
  window.dispatchEvent(new Event(DETAIL_WIDTH_CHANGE_EVENT));
}

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
    return Math.max(DEFAULT_DETAIL_WIDTH, workspaceWidth - 236 - 420);
  }
  const reservedWidth = workspaceWidth <= 899 ? 16 : 236;
  return Math.max(DEFAULT_DETAIL_WIDTH, workspaceWidth - reservedWidth);
}

function clampDetailWidth(width: number, workspaceWidth: number): number {
  return Math.round(Math.max(DEFAULT_DETAIL_WIDTH, Math.min(width, maxDetailWidth(workspaceWidth))));
}

function clampStoredDetailWidth(width: number): number {
  return Math.round(Math.max(DEFAULT_DETAIL_WIDTH, width));
}

function parseDetailSize(snapshot: string): DetailSize {
  try {
    const saved = JSON.parse(snapshot) as Partial<DetailSize>;
    if (!Number.isFinite(saved.width) || !Number.isFinite(saved.restoreWidth)) return DEFAULT_DETAIL_SIZE;
    return {
      expanded: saved.expanded === true,
      restoreWidth: clampStoredDetailWidth(saved.restoreWidth!),
      width: clampStoredDetailWidth(saved.width!),
    };
  } catch {
    return DEFAULT_DETAIL_SIZE;
  }
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

  const detailSizeSnapshot = useSyncExternalStore(
    subscribeToDetailSize,
    readDetailSizeSnapshot,
    () => DEFAULT_DETAIL_SIZE_SNAPSHOT,
  );
  const detailSize = useMemo(
    () => parseDetailSize(detailSizeSnapshot),
    [detailSizeSnapshot],
  );
  const viewportWidth = useSyncExternalStore(
    subscribeToViewportWidth,
    readViewportWidth,
    () => DEFAULT_VIEWPORT_WIDTH,
  );
  const effectiveDetailWidth = clampDetailWidth(detailSize.width, viewportWidth);
  const effectiveMaxDetailWidth = maxDetailWidth(viewportWidth);

  const saveDetailSize = useCallback((next: DetailSize) => {
    writeDetailSizeSnapshot(next);
  }, []);

  const resizeDetail = useCallback((width: number) => {
    const nextWidth = clampDetailWidth(width, getWorkspaceWidth());
    saveDetailSize({ expanded: false, restoreWidth: nextWidth, width: nextWidth });
  }, [getWorkspaceWidth, saveDetailSize]);

  const resetDetailWidth = useCallback(() => {
    saveDetailSize({
      expanded: false,
      restoreWidth: DEFAULT_DETAIL_WIDTH,
      width: DEFAULT_DETAIL_WIDTH,
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
                detailMaxWidth={effectiveMaxDetailWidth}
                detailWidth={effectiveDetailWidth}
                expanded={detailSize.expanded}
                onClose={() => selectPerson(null)}
                onResetWidth={resetDetailWidth}
                onResize={resizeDetail}
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
