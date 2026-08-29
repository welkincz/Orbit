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
  afterEach(cleanup);

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
});
