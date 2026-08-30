import { describe, expect, it } from "vitest";
import {
  SERVER_THEME_SNAPSHOT,
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  safeReadTheme,
  safeWriteTheme,
} from "@/lib/theme";

describe("theme preference domain", () => {
  it.each([
    { value: "light", expected: "light" },
    { value: "dark", expected: "dark" },
    { value: null, expected: null },
    { value: "system", expected: null },
    { value: "DARK", expected: null },
    { value: "", expected: null },
  ] as const)("parses '$value' as $expected", ({ value, expected }) => {
    expect(parseThemePreference(value)).toBe(expected);
  });

  it.each([
    { preference: null, systemDark: false, expected: { theme: "light", source: "system" } },
    { preference: null, systemDark: true, expected: { theme: "dark", source: "system" } },
    { preference: "light", systemDark: true, expected: { theme: "light", source: "manual" } },
    { preference: "dark", systemDark: false, expected: { theme: "dark", source: "manual" } },
  ] as const)(
    "resolves $preference with systemDark=$systemDark",
    ({ preference, systemDark, expected }) => {
      expect(resolveTheme(preference, systemDark)).toEqual(expected);
    },
  );

  it("uses a stable Light system snapshot for server rendering", () => {
    expect(SERVER_THEME_SNAPSHOT).toEqual({ theme: "light", source: "system" });
    expect(Object.isFrozen(SERVER_THEME_SNAPSHOT)).toBe(true);
  });

  it("reads and validates the versioned stored preference", () => {
    const storage = {
      getItem(key: string) {
        expect(key).toBe(THEME_STORAGE_KEY);
        return "dark";
      },
    };

    expect(safeReadTheme(storage)).toBe("dark");
  });

  it("treats missing, invalid, or unreadable storage as no preference", () => {
    expect(safeReadTheme(null)).toBeNull();
    expect(safeReadTheme({ getItem: () => "sepia" })).toBeNull();
    expect(safeReadTheme({ getItem: () => { throw new Error("blocked"); } })).toBeNull();
  });

  it("writes the explicit theme to the versioned key", () => {
    const values = new Map<string, string>();
    const storage = {
      setItem(key: string, value: string) {
        values.set(key, value);
      },
    };

    expect(safeWriteTheme(storage, "dark")).toBe(true);
    expect(values.get(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("reports unavailable or failed writes without throwing", () => {
    expect(safeWriteTheme(null, "light")).toBe(false);
    expect(safeWriteTheme({ setItem: () => { throw new Error("quota"); } }, "light")).toBe(false);
  });
});
