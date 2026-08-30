import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function renderToggle() {
  return render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
}

describe("Eclipse theme switch", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themeTransition;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => true,
      }),
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it("announces the destination and exposes the current theme as switch state", async () => {
    const user = userEvent.setup();
    renderToggle();
    const toggle = screen.getByRole("switch", { name: "Switch to dark mode" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);

    expect(screen.getByRole("switch", { name: "Switch to light mode" }))
      .toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("supports native Space and Enter keyboard activation", async () => {
    const user = userEvent.setup();
    renderToggle();
    const toggle = screen.getByRole("switch", { name: "Switch to dark mode" });
    toggle.focus();

    await user.keyboard(" ");
    expect(screen.getByRole("switch", { name: "Switch to light mode" })).toBeVisible();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("switch", { name: "Switch to dark mode" })).toBeVisible();
  });

  it("retargets immediately when toggled twice during a transition", async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole("switch", { name: "Switch to dark mode" }));
    await user.click(screen.getByRole("switch", { name: "Switch to light mode" }));

    expect(screen.getByRole("switch", { name: "Switch to dark mode" }))
      .toHaveAttribute("aria-checked", "false");
    expect(document.documentElement.dataset.themeTransition).toBe("entering-light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
