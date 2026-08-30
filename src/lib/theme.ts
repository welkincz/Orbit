export type ThemeName = "light" | "dark";
export type ThemeSource = "system" | "manual";

export interface ThemeSnapshot {
  theme: ThemeName;
  source: ThemeSource;
}

export const THEME_STORAGE_KEY = "orbit.theme.v1";

export const SERVER_THEME_SNAPSHOT: Readonly<ThemeSnapshot> = Object.freeze({
  theme: "light",
  source: "system",
});

export function parseThemePreference(value: string | null): ThemeName | null {
  return value === "light" || value === "dark" ? value : null;
}

export function resolveTheme(
  preference: ThemeName | null,
  systemDark: boolean,
): ThemeSnapshot {
  if (preference) return { theme: preference, source: "manual" };
  return { theme: systemDark ? "dark" : "light", source: "system" };
}

export function safeReadTheme(
  storage: Pick<Storage, "getItem"> | null,
): ThemeName | null {
  if (!storage) return null;
  try {
    return parseThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function safeWriteTheme(
  storage: Pick<Storage, "setItem"> | null,
  theme: ThemeName,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}
