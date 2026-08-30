import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkWorkspace } from "@/components/network/NetworkWorkspace";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
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

function renderWorkspace() {
  return render(
    <ThemeProvider>
      <NetworkWorkspace currentDate="2026-08-29" initialDataset={dataset} />
    </ThemeProvider>,
  );
}

describe("NetworkWorkspace detail sizing", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  });

  it("expands to half the workspace and persists the chosen size", async () => {
    const user = userEvent.setup();
    const { container } = renderWorkspace();

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
    const { container } = renderWorkspace();

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
    const { container } = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /jane doe/i }));
    const workspace = container.querySelector<HTMLElement>(".orbit-workspace")!;
    expect(workspace.style.getPropertyValue("--detail-width")).toBe("624px");
    expect(screen.getByRole("separator", { name: "Resize details" })).toHaveAttribute("aria-valuenow", "624");
  });

  it("expands to half of a large desktop workspace", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1920 });
    const user = userEvent.setup();
    const { container } = renderWorkspace();

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
    const { container } = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /jane doe/i }));
    const workspace = container.querySelector<HTMLElement>(".orbit-workspace")!;
    Object.defineProperty(workspace, "clientWidth", { configurable: true, value: 1440 });
    await user.click(screen.getByRole("button", { name: "Expand details" }));
    expect(workspace.style.getPropertyValue("--detail-width")).toBe("720px");
    expect(screen.getByRole("button", { name: "Restore details" })).toBeVisible();
  });
});

describe("NetworkWorkspace resize persistence", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("writes storage once on release instead of on every pointer move", async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { container } = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /jane doe/i }));
    const workspace = container.querySelector<HTMLElement>(".orbit-workspace")!;
    Object.defineProperty(workspace, "clientWidth", { configurable: true, value: 1440 });
    const handle = screen.getByRole("separator", { name: "Resize details" });

    setItem.mockClear();
    fireEvent.pointerDown(handle, { clientX: 900, pointerId: 1 });
    for (let clientX = 890; clientX >= 810; clientX -= 10) {
      fireEvent.pointerMove(handle, { clientX, pointerId: 1 });
    }

    expect(setItem).not.toHaveBeenCalled();
    expect(workspace.style.getPropertyValue("--detail-width")).toBe("458px");

    fireEvent.pointerUp(handle, { pointerId: 1 });

    const detailWrites = setItem.mock.calls.filter(([key]) => key === "orbit.detail-width.v1");
    expect(detailWrites).toHaveLength(1);
    expect(JSON.parse(detailWrites[0][1] as string)).toMatchObject({ width: 458 });
  });
});

describe("NetworkWorkspace data warnings", () => {
  afterEach(cleanup);

  it("surfaces dataset diagnostics and lets them be dismissed", async () => {
    const user = userEvent.setup();
    const warned: PeopleDataset = {
      ...dataset,
      diagnostics: [
        {
          level: "warning",
          code: "last-contact-mismatch",
          message: "Frontmatter last_contact 2026-01-01 is older than interaction 2026-06-01.",
          sourceRelativePath: "data/people/jane.md",
        },
        {
          level: "warning",
          code: "inner-circle-size",
          message: "Inner Circle contains more than 10 people",
        },
      ],
    };

    render(
      <ThemeProvider>
        <NetworkWorkspace currentDate="2026-08-29" initialDataset={warned} />
      </ThemeProvider>,
    );

    const warnings = screen.getByRole("region", { name: /data warnings/i });
    expect(warnings).toBeVisible();
    expect(screen.getByText(/older than interaction 2026-06-01/)).toBeVisible();
    expect(screen.getByText("data/people/jane.md")).toBeVisible();
    expect(screen.getByText("Inner Circle contains more than 10 people")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Dismiss data warnings" }));
    expect(screen.queryByRole("region", { name: /data warnings/i })).not.toBeInTheDocument();
  });

  it("renders no warning region when the dataset is clean", () => {
    render(
      <ThemeProvider>
        <NetworkWorkspace currentDate="2026-08-29" initialDataset={dataset} />
      </ThemeProvider>,
    );

    expect(screen.queryByRole("region", { name: /data warnings/i })).not.toBeInTheDocument();
  });
});

describe("NetworkWorkspace load freshness", () => {
  afterEach(cleanup);

  it("shows when the dataset was last read from disk", () => {
    render(
      <ThemeProvider>
        <NetworkWorkspace currentDate="2026-08-29" initialDataset={dataset} />
      </ThemeProvider>,
    );

    const stamp = screen.getByTestId("orbit-loaded-at");
    expect(stamp).toBeVisible();
    expect(stamp).toHaveAttribute("dateTime", "2026-08-29T00:00:00.000Z");
    expect(stamp.textContent).toMatch(/^Read \d{1,2}:\d{2}/);
  });
});

describe("NetworkWorkspace keyboard dismissal", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("closes the detail panel with Escape", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /jane doe/i }));
    expect(await screen.findByRole("complementary", { name: "Jane Doe details" })).toBeVisible();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("complementary", { name: "Jane Doe details" })).not.toBeInTheDocument();
    });
  });

  it("leaves Escape alone while the search dialog owns it", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /jane doe/i }));
    await user.click(screen.getByRole("button", { name: /search/i }));
    expect(await screen.findByRole("dialog")).toBeVisible();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("complementary", { name: "Jane Doe details" })).toBeVisible();
  });
});
