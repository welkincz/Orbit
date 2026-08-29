import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkWorkspace } from "@/components/network/NetworkWorkspace";
import type { PeopleDataset } from "@/types/person";
import { makePerson } from "./fixtures/people";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

const jane = makePerson({
  id: "jane",
  name: "Jane Doe",
  innerCircle: true,
  relationshipStrength: 4,
});

const dataset: PeopleDataset = {
  people: [makePerson({ id: "self", name: "Charlie", type: "self" }), jane],
  selfId: "self",
  diagnostics: [],
  loadedAt: "2026-08-29T00:00:00.000Z",
};

describe("NetworkWorkspace detail sizing", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  });

  it("expands to half the workspace and persists the chosen size", async () => {
    const user = userEvent.setup();
    const { container } = render(<NetworkWorkspace currentDate="2026-08-29" initialDataset={dataset} />);

    await user.click(screen.getByRole("button", { name: /jane doe/i }));
    const workspace = container.querySelector<HTMLElement>(".orbit-workspace")!;
    Object.defineProperty(workspace, "clientWidth", { configurable: true, value: 1440 });
    await user.click(screen.getByRole("button", { name: "Expand details" }));

    expect(workspace.style.getPropertyValue("--detail-width")).toBe("720px");
    expect(workspace).toHaveClass("has-detail-expanded");
    expect(JSON.parse(localStorage.getItem("orbit.detail-width.v1")!)).toMatchObject({
      expanded: true,
      width: 720,
    });
  });

  it("restores a previously chosen width from local storage", async () => {
    localStorage.setItem("orbit.detail-width.v1", JSON.stringify({
      expanded: false,
      restoreWidth: 368,
      width: 520,
    }));
    const user = userEvent.setup();
    const { container } = render(<NetworkWorkspace currentDate="2026-08-29" initialDataset={dataset} />);

    await user.click(screen.getByRole("button", { name: /jane doe/i }));
    const workspace = container.querySelector<HTMLElement>(".orbit-workspace")!;
    await waitFor(() => expect(workspace.style.getPropertyValue("--detail-width")).toBe("520px"));
    expect(screen.getByRole("button", { name: "Expand details" })).toBeVisible();
  });

  it("clamps a persisted width to the current desktop workspace", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    localStorage.setItem("orbit.detail-width.v1", JSON.stringify({
      expanded: true,
      restoreWidth: 368,
      width: 720,
    }));
    const user = userEvent.setup();
    const { container } = render(<NetworkWorkspace currentDate="2026-08-29" initialDataset={dataset} />);

    await user.click(screen.getByRole("button", { name: /jane doe/i }));
    const workspace = container.querySelector<HTMLElement>(".orbit-workspace")!;
    expect(workspace.style.getPropertyValue("--detail-width")).toBe("624px");
    expect(screen.getByRole("separator", { name: "Resize details" })).toHaveAttribute("aria-valuenow", "624");
  });

  it("expands to half of a large desktop workspace", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1920 });
    const user = userEvent.setup();
    const { container } = render(<NetworkWorkspace currentDate="2026-08-29" initialDataset={dataset} />);

    await user.click(screen.getByRole("button", { name: /jane doe/i }));
    const workspace = container.querySelector<HTMLElement>(".orbit-workspace")!;
    Object.defineProperty(workspace, "clientWidth", { configurable: true, value: 1920 });
    await user.click(screen.getByRole("button", { name: "Expand details" }));
    expect(workspace.style.getPropertyValue("--detail-width")).toBe("960px");
  });

  it("keeps resizing responsive when local-storage writes fail", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    const user = userEvent.setup();
    const { container } = render(<NetworkWorkspace currentDate="2026-08-29" initialDataset={dataset} />);

    await user.click(screen.getByRole("button", { name: /jane doe/i }));
    const workspace = container.querySelector<HTMLElement>(".orbit-workspace")!;
    Object.defineProperty(workspace, "clientWidth", { configurable: true, value: 1440 });
    await user.click(screen.getByRole("button", { name: "Expand details" }));
    expect(workspace.style.getPropertyValue("--detail-width")).toBe("720px");
    expect(screen.getByRole("button", { name: "Restore details" })).toBeVisible();
  });
});
