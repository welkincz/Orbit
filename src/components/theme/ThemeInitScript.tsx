import { THEME_STORAGE_KEY } from "@/lib/theme";

export const THEME_INIT_SCRIPT = `(() => {
  let preference = null;
  try {
    const value = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    preference = value === "light" || value === "dark" ? value : null;
  } catch {}

  let systemDark = false;
  if (preference === null) {
    try {
      systemDark = typeof window.matchMedia === "function"
        && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {}
  }

  const theme = preference ?? (systemDark ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();`;

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
