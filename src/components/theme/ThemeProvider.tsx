"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createBrowserThemeEnvironment,
  createThemeStore,
} from "@/lib/theme-store";
import type { ThemeName } from "@/lib/theme";

export interface ThemeContextValue {
  theme: ThemeName;
  toggleTheme(): void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createThemeStore(createBrowserThemeEnvironment()));
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const toggleTheme = useCallback(() => store.toggleTheme(), [store]);
  const value = useMemo(
    () => ({ theme: snapshot.theme, toggleTheme }),
    [snapshot.theme, toggleTheme],
  );

  useEffect(() => () => store.destroy(), [store]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
