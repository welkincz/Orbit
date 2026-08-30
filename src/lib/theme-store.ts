import {
  SERVER_THEME_SNAPSHOT,
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  safeReadTheme,
  safeWriteTheme,
  type ThemeName,
  type ThemeSnapshot,
} from "@/lib/theme";

export type ThemeTransition = "idle" | "entering-light" | "entering-dark";

export interface ThemeStoreSnapshot extends ThemeSnapshot {
  transition: ThemeTransition;
}

export interface ThemeEnvironment {
  readStoredPreference(): ThemeName | null;
  writeStoredPreference(theme: ThemeName): boolean;
  systemPrefersDark(): boolean;
  applyRootTheme(theme: ThemeName, transition: ThemeTransition): void;
  clearRootTransition(): void;
  subscribeToStorage(listener: (preference: ThemeName | null) => void): () => void;
  subscribeToSystem(listener: (systemDark: boolean) => void): () => void;
  schedule(callback: () => void, delayMs: number): () => void;
}

export interface ThemeStore {
  getSnapshot(): ThemeStoreSnapshot;
  getServerSnapshot(): ThemeStoreSnapshot;
  subscribe(listener: () => void): () => void;
  toggleTheme(): void;
  destroy(): void;
}

const THEME_TRANSITION_DURATION_MS = 520;
const SERVER_STORE_SNAPSHOT: ThemeStoreSnapshot = Object.freeze({
  ...SERVER_THEME_SNAPSHOT,
  transition: "idle",
});

function initialSnapshot(environment: ThemeEnvironment): ThemeStoreSnapshot {
  const resolved = resolveTheme(
    environment.readStoredPreference(),
    environment.systemPrefersDark(),
  );
  return { ...resolved, transition: "idle" };
}

export function createThemeStore(environment: ThemeEnvironment): ThemeStore {
  let snapshot = initialSnapshot(environment);
  let destroyed = false;
  let subscriptionsStarted = false;
  let cancelStorageSubscription: (() => void) | null = null;
  let cancelSystemSubscription: (() => void) | null = null;
  let cancelTransitionCleanup: (() => void) | null = null;
  let transitionVersion = 0;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());

  const finishTransition = (version: number) => {
    if (destroyed || version !== transitionVersion || snapshot.transition === "idle") return;
    environment.clearRootTransition();
    snapshot = { ...snapshot, transition: "idle" };
    cancelTransitionCleanup = null;
    emit();
  };

  const moveTo = (theme: ThemeName, source: ThemeSnapshot["source"]) => {
    if (destroyed) return;
    if (snapshot.theme === theme) {
      if (snapshot.source === source) return;
      snapshot = { theme, source, transition: snapshot.transition };
      emit();
      return;
    }

    cancelTransitionCleanup?.();
    transitionVersion += 1;
    const version = transitionVersion;
    const transition: ThemeTransition = theme === "dark" ? "entering-dark" : "entering-light";
    snapshot = { theme, source, transition };
    environment.applyRootTheme(theme, transition);
    emit();
    cancelTransitionCleanup = environment.schedule(
      () => finishTransition(version),
      THEME_TRANSITION_DURATION_MS,
    );
  };

  const startSubscriptions = () => {
    if (subscriptionsStarted || destroyed) return;
    subscriptionsStarted = true;
    environment.applyRootTheme(snapshot.theme, "idle");
    cancelStorageSubscription = environment.subscribeToStorage((preference) => {
      if (preference) {
        moveTo(preference, "manual");
        return;
      }
      moveTo(environment.systemPrefersDark() ? "dark" : "light", "system");
    });
    cancelSystemSubscription = environment.subscribeToSystem((systemDark) => {
      if (snapshot.source === "system") moveTo(systemDark ? "dark" : "light", "system");
    });
  };

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => SERVER_STORE_SNAPSHOT,
    subscribe(listener) {
      if (destroyed) return () => {};
      listeners.add(listener);
      startSubscriptions();
      return () => listeners.delete(listener);
    },
    toggleTheme() {
      if (destroyed) return;
      const theme = snapshot.theme === "dark" ? "light" : "dark";
      environment.writeStoredPreference(theme);
      moveTo(theme, "manual");
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      transitionVersion += 1;
      cancelTransitionCleanup?.();
      cancelStorageSubscription?.();
      cancelSystemSubscription?.();
      listeners.clear();
    },
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

function browserMediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia("(prefers-color-scheme: dark)");
}

export function createBrowserThemeEnvironment(): ThemeEnvironment {
  return {
    readStoredPreference: () => safeReadTheme(browserStorage()),
    writeStoredPreference: (theme) => safeWriteTheme(browserStorage(), theme),
    systemPrefersDark: () => browserMediaQuery()?.matches ?? false,
    applyRootTheme(theme, transition) {
      if (typeof document === "undefined") return;
      const root = document.documentElement;
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
      if (transition === "idle") {
        delete root.dataset.themeTransition;
      } else {
        root.dataset.themeTransition = transition;
      }
    },
    clearRootTransition() {
      if (typeof document !== "undefined") delete document.documentElement.dataset.themeTransition;
    },
    subscribeToStorage(listener) {
      if (typeof window === "undefined") return () => {};
      const handleStorage = (event: StorageEvent) => {
        if (event.key !== THEME_STORAGE_KEY) return;
        listener(parseThemePreference(event.newValue));
      };
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    },
    subscribeToSystem(listener) {
      const mediaQuery = browserMediaQuery();
      if (!mediaQuery) return () => {};
      const handleChange = (event: MediaQueryListEvent) => listener(event.matches);
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
      }

      const legacyQuery = mediaQuery as MediaQueryList & {
        addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
        removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      };
      legacyQuery.addListener?.(handleChange);
      return () => legacyQuery.removeListener?.(handleChange);
    },
    schedule(callback, delayMs) {
      const timer = globalThis.setTimeout(callback, delayMs);
      return () => globalThis.clearTimeout(timer);
    },
  };
}
