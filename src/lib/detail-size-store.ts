export const DETAIL_WIDTH_STORAGE_KEY = "orbit.detail-width.v1";
export const MIN_DETAIL_WIDTH = 368;

export interface DetailSize {
  expanded: boolean;
  restoreWidth: number;
  width: number;
}

export const DEFAULT_DETAIL_SIZE: Readonly<DetailSize> = Object.freeze({
  expanded: false,
  restoreWidth: MIN_DETAIL_WIDTH,
  width: MIN_DETAIL_WIDTH,
});

export interface DetailSizeEnvironment {
  readStored(): string | null;
  writeStored(snapshot: string): boolean;
  subscribeToStorage(listener: () => void): () => void;
}

export interface DetailSizeStore {
  getSnapshot(): DetailSize;
  getServerSnapshot(): DetailSize;
  subscribe(listener: () => void): () => void;
  /**
   * `persist: false` keeps a drag responsive without a synchronous storage
   * write per pointer event; `commit` writes the settled size once.
   */
  setSize(next: DetailSize, options?: { persist?: boolean }): void;
  commit(): void;
}

function clampStoredWidth(width: number): number {
  return Math.round(Math.max(MIN_DETAIL_WIDTH, width));
}

export function parseDetailSize(snapshot: string | null): DetailSize {
  if (snapshot === null) return { ...DEFAULT_DETAIL_SIZE };
  try {
    const saved = JSON.parse(snapshot) as Partial<DetailSize>;
    if (!Number.isFinite(saved.width) || !Number.isFinite(saved.restoreWidth)) {
      return { ...DEFAULT_DETAIL_SIZE };
    }
    return {
      expanded: saved.expanded === true,
      restoreWidth: clampStoredWidth(saved.restoreWidth!),
      width: clampStoredWidth(saved.width!),
    };
  } catch {
    return { ...DEFAULT_DETAIL_SIZE };
  }
}

function sameSize(left: DetailSize, right: DetailSize): boolean {
  return left.expanded === right.expanded
    && left.restoreWidth === right.restoreWidth
    && left.width === right.width;
}

export function createDetailSizeStore(environment: DetailSizeEnvironment): DetailSizeStore {
  let snapshot = parseDetailSize(environment.readStored());
  let cancelStorageSubscription: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());

  const persist = () => {
    // A failed write leaves the in-memory snapshot authoritative, so resizing
    // still works in a browser with storage disabled.
    environment.writeStored(JSON.stringify(snapshot));
  };

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => DEFAULT_DETAIL_SIZE,
    subscribe(listener) {
      listeners.add(listener);
      cancelStorageSubscription ??= environment.subscribeToStorage(() => {
        const next = parseDetailSize(environment.readStored());
        if (sameSize(next, snapshot)) return;
        snapshot = next;
        emit();
      });

      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        cancelStorageSubscription?.();
        cancelStorageSubscription = null;
      };
    },
    setSize(next, options) {
      const changed = !sameSize(next, snapshot);
      if (changed) snapshot = { ...next };
      if (options?.persist !== false) persist();
      if (changed) emit();
    },
    commit: persist,
  };
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createBrowserDetailSizeEnvironment(): DetailSizeEnvironment {
  return {
    readStored() {
      try {
        return browserStorage()?.getItem(DETAIL_WIDTH_STORAGE_KEY) ?? null;
      } catch {
        return null;
      }
    },
    writeStored(snapshot) {
      try {
        browserStorage()?.setItem(DETAIL_WIDTH_STORAGE_KEY, snapshot);
        return true;
      } catch {
        return false;
      }
    },
    subscribeToStorage(listener) {
      if (typeof window === "undefined") return () => {};
      const handleStorage = (event: StorageEvent) => {
        if (event.key !== null && event.key !== DETAIL_WIDTH_STORAGE_KEY) return;
        listener();
      };
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    },
  };
}
