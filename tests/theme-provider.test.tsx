import { cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "@/components/theme/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme}</button>;
}

function setSystemDark(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => true,
    }),
  });
}

describe("ThemeProvider", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themeTransition;
    document.documentElement.style.colorScheme = "";
    setSystemDark(false);
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it("uses the stable Light server snapshot during server rendering", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    const html = renderToString(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    expect(html).toContain(">light</button>");
  });

  it("exposes the resolved browser theme and toggles the real root state", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    expect(screen.getByRole("button", { name: "dark" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "dark" }));

    expect(screen.getByRole("button", { name: "light" })).toBeVisible();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.documentElement.dataset.themeTransition).toBe("entering-light");
  });

  it("stops reacting to storage events after unmount", () => {
    const view = render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    expect(document.documentElement.dataset.theme).toBe("light");
    view.unmount();

    window.dispatchEvent(new StorageEvent("storage", {
      key: THEME_STORAGE_KEY,
      newValue: "dark",
    }));

    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("keeps toggling after a StrictMode remount", async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>
      </StrictMode>,
    );

    // StrictMode mounts, unmounts, and remounts effects. The provider's cleanup
    // must not leave the store permanently unusable.
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("light");

    await user.click(button);
    expect(button).toHaveTextContent("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
