import { describe, expect, it } from "vitest";
import {
  createThemeStore,
  type ThemeEnvironment,
  type ThemeTransition,
} from "@/lib/theme-store";
import type { ThemeName } from "@/lib/theme";

interface ScheduledCallback {
  active: boolean;
  callback: () => void;
  delayMs: number;
}

function fakeEnvironment(options: {
  stored?: ThemeName | null;
  systemDark?: boolean;
  writeSucceeds?: boolean;
} = {}) {
  let stored = options.stored ?? null;
  let systemDark = options.systemDark ?? false;
  let rootTheme: ThemeName | null = null;
  let rootTransition: ThemeTransition = "idle";
  const writes: ThemeName[] = [];
  const storageListeners = new Set<(preference: ThemeName | null) => void>();
  const systemListeners = new Set<(dark: boolean) => void>();
  const scheduled: ScheduledCallback[] = [];

  const environment: ThemeEnvironment = {
    readStoredPreference: () => stored,
    writeStoredPreference(theme) {
      writes.push(theme);
      if (options.writeSucceeds === false) return false;
      stored = theme;
      return true;
    },
    systemPrefersDark: () => systemDark,
    applyRootTheme(theme, transition) {
      rootTheme = theme;
      rootTransition = transition;
    },
    clearRootTransition() {
      rootTransition = "idle";
    },
    subscribeToStorage(listener) {
      storageListeners.add(listener);
      return () => storageListeners.delete(listener);
    },
    subscribeToSystem(listener) {
      systemListeners.add(listener);
      return () => systemListeners.delete(listener);
    },
    schedule(callback, delayMs) {
      const entry = { active: true, callback, delayMs };
      scheduled.push(entry);
      return () => { entry.active = false; };
    },
  };

  return {
    environment,
    writes,
    scheduled,
    emitStorage(preference: ThemeName | null) {
      stored = preference;
      storageListeners.forEach((listener) => listener(preference));
    },
    emitSystem(dark: boolean) {
      systemDark = dark;
      systemListeners.forEach((listener) => listener(dark));
    },
    get rootTheme() { return rootTheme; },
    get rootTransition() { return rootTransition; },
    get storageSubscriberCount() { return storageListeners.size; },
    get systemSubscriberCount() { return systemListeners.size; },
  };
}

describe("theme store", () => {
  it("resolves its initial snapshot from a stored preference or the system", () => {
    expect(createThemeStore(fakeEnvironment({ systemDark: true }).environment).getSnapshot())
      .toEqual({ theme: "dark", source: "system", transition: "idle" });
    expect(createThemeStore(fakeEnvironment({ stored: "light", systemDark: true }).environment).getSnapshot())
      .toEqual({ theme: "light", source: "manual", transition: "idle" });
  });

  it("keeps the snapshot reference stable until observable state changes", () => {
    const fake = fakeEnvironment();
    const store = createThemeStore(fake.environment);
    const original = store.getSnapshot();
    const unsubscribe = store.subscribe(() => {});

    expect(store.getSnapshot()).toBe(original);
    fake.emitSystem(true);
    expect(store.getSnapshot()).not.toBe(original);
    expect(store.getSnapshot()).toMatchObject({ theme: "dark", source: "system" });

    unsubscribe();
  });

  it("follows system changes only before a manual choice", () => {
    const fake = fakeEnvironment();
    const store = createThemeStore(fake.environment);
    const unsubscribe = store.subscribe(() => {});

    fake.emitSystem(true);
    expect(store.getSnapshot().theme).toBe("dark");

    store.toggleTheme();
    expect(store.getSnapshot()).toMatchObject({ theme: "light", source: "manual" });
    fake.emitSystem(true);
    expect(store.getSnapshot()).toMatchObject({ theme: "light", source: "manual" });

    unsubscribe();
  });

  it("synchronizes valid cross-tab choices and returns to system when the key is removed", () => {
    const fake = fakeEnvironment({ systemDark: true });
    const store = createThemeStore(fake.environment);
    const unsubscribe = store.subscribe(() => {});

    fake.emitStorage("light");
    expect(store.getSnapshot()).toMatchObject({ theme: "light", source: "manual" });

    fake.emitStorage(null);
    expect(store.getSnapshot()).toMatchObject({ theme: "dark", source: "system" });

    unsubscribe();
  });

  it("keeps a failed manual write active in memory", () => {
    const fake = fakeEnvironment({ writeSucceeds: false });
    const store = createThemeStore(fake.environment);
    const unsubscribe = store.subscribe(() => {});

    store.toggleTheme();

    expect(fake.writes).toEqual(["dark"]);
    expect(store.getSnapshot()).toMatchObject({ theme: "dark", source: "manual" });
    fake.emitSystem(false);
    expect(store.getSnapshot()).toMatchObject({ theme: "dark", source: "manual" });

    unsubscribe();
  });

  it("cleans a theme transition after 520ms", () => {
    const fake = fakeEnvironment();
    const store = createThemeStore(fake.environment);
    const unsubscribe = store.subscribe(() => {});

    store.toggleTheme();
    expect(store.getSnapshot().transition).toBe("entering-dark");
    expect(fake.rootTheme).toBe("dark");
    expect(fake.rootTransition).toBe("entering-dark");
    expect(fake.scheduled[0]).toMatchObject({ active: true, delayMs: 520 });

    fake.scheduled[0].callback();
    expect(store.getSnapshot().transition).toBe("idle");
    expect(fake.rootTransition).toBe("idle");

    unsubscribe();
  });

  it("cancels an earlier cleanup when rapid reversal retargets the transition", () => {
    const fake = fakeEnvironment();
    const store = createThemeStore(fake.environment);
    const unsubscribe = store.subscribe(() => {});

    store.toggleTheme();
    store.toggleTheme();

    expect(fake.scheduled).toHaveLength(2);
    expect(fake.scheduled[0].active).toBe(false);
    expect(fake.scheduled[1]).toMatchObject({ active: true, delayMs: 520 });
    expect(store.getSnapshot()).toMatchObject({ theme: "light", transition: "entering-light" });

    unsubscribe();
  });

  it("releases browser subscriptions and pending work when destroyed", () => {
    const fake = fakeEnvironment();
    const store = createThemeStore(fake.environment);
    store.subscribe(() => {});
    store.toggleTheme();

    expect(fake.storageSubscriberCount).toBe(1);
    expect(fake.systemSubscriberCount).toBe(1);
    store.destroy();
    expect(fake.storageSubscriberCount).toBe(0);
    expect(fake.systemSubscriberCount).toBe(0);
    expect(fake.scheduled[0].active).toBe(false);
  });
});
