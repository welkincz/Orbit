import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DETAIL_SIZE,
  createDetailSizeStore,
  type DetailSizeEnvironment,
} from "@/lib/detail-size-store";

function testEnvironment(initial: string | null = null) {
  let stored = initial;
  let failWrites = false;
  const listeners = new Set<() => void>();

  const environment: DetailSizeEnvironment = {
    readStored: () => stored,
    writeStored(snapshot) {
      if (failWrites) return false;
      stored = snapshot;
      return true;
    },
    subscribeToStorage(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return {
    environment,
    get stored() { return stored; },
    set stored(value: string | null) { stored = value; },
    failWrites(value: boolean) { failWrites = value; },
    emitStorageChange: () => listeners.forEach((listener) => listener()),
  };
}

describe("detail size store", () => {
  it("starts from the default size when nothing is stored", () => {
    const store = createDetailSizeStore(testEnvironment().environment);
    expect(store.getSnapshot()).toEqual(DEFAULT_DETAIL_SIZE);
  });

  it("returns a stable snapshot reference until the size changes", () => {
    const store = createDetailSizeStore(testEnvironment().environment);
    const first = store.getSnapshot();

    expect(store.getSnapshot()).toBe(first);

    store.setSize({ expanded: false, restoreWidth: 500, width: 500 });
    expect(store.getSnapshot()).not.toBe(first);
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("reads a stored size and clamps it to the minimum width", () => {
    const environment = testEnvironment(JSON.stringify({ expanded: false, restoreWidth: 10, width: 520 }));
    const store = createDetailSizeStore(environment.environment);

    expect(store.getSnapshot()).toEqual({ expanded: false, restoreWidth: 368, width: 520 });
  });

  it("falls back to the default size for unparseable stored data", () => {
    const store = createDetailSizeStore(testEnvironment("{{ not json").environment);
    expect(store.getSnapshot()).toEqual(DEFAULT_DETAIL_SIZE);
  });

  it("does not touch storage for a transient resize, then persists on commit", () => {
    const environment = testEnvironment();
    const store = createDetailSizeStore(environment.environment);

    store.setSize({ expanded: false, restoreWidth: 500, width: 500 }, { persist: false });
    expect(environment.stored).toBeNull();
    expect(store.getSnapshot().width).toBe(500);

    store.commit();
    expect(JSON.parse(environment.stored!)).toMatchObject({ width: 500 });
  });

  it("keeps the in-memory size usable when storage writes fail", () => {
    const environment = testEnvironment();
    environment.failWrites(true);
    const store = createDetailSizeStore(environment.environment);

    store.setSize({ expanded: true, restoreWidth: 368, width: 640 });

    expect(environment.stored).toBeNull();
    expect(store.getSnapshot()).toEqual({ expanded: true, restoreWidth: 368, width: 640 });
  });

  it("notifies subscribers and adopts a size written by another tab", () => {
    const environment = testEnvironment();
    const store = createDetailSizeStore(environment.environment);
    const listener = vi.fn();
    store.subscribe(listener);

    environment.stored = JSON.stringify({ expanded: true, restoreWidth: 368, width: 700 });
    environment.emitStorageChange();

    expect(listener).toHaveBeenCalled();
    expect(store.getSnapshot()).toEqual({ expanded: true, restoreWidth: 368, width: 700 });
  });

  it("stops notifying after unsubscribe", () => {
    const environment = testEnvironment();
    const store = createDetailSizeStore(environment.environment);
    const listener = vi.fn();

    store.subscribe(listener)();
    store.setSize({ expanded: false, restoreWidth: 400, width: 400 });

    expect(listener).not.toHaveBeenCalled();
  });
});
