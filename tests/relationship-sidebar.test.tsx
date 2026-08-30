import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RelationshipSidebar } from "@/components/people/RelationshipSidebar";
import type { PeopleDataset } from "@/types/person";
import { makePerson } from "./fixtures/people";

const jane = makePerson({
  id: "jane",
  name: "Jane Doe",
  role: "Product lead",
  team: "Strategy",
  company: "Arc Systems",
  innerCircle: true,
  target: true,
  relationshipStrength: 4,
  strategicRelevance: "high",
  effectiveLastContact: "2026-08-18",
  desiredCadenceDays: 5,
});

const datasetWithOverlappingJane: PeopleDataset = {
  people: [makePerson({ id: "self", name: "Charlie", type: "self" }), jane],
  selfId: "self",
  diagnostics: [],
  loadedAt: "2026-08-27T00:00:00.000Z",
};

describe("RelationshipSidebar", () => {
  afterEach(cleanup);

  it("keeps one person in every matching derived group and selects the clicked row", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<RelationshipSidebar
      dataset={datasetWithOverlappingJane}
      currentDate="2026-08-27"
      selectedId={null}
      onSelect={onSelect}
    />);

    expect(screen.getAllByRole("button", { name: /jane doe/i })).toHaveLength(4);
    await user.click(screen.getAllByRole("button", { name: /jane doe/i })[1]);
    expect(onSelect).toHaveBeenCalledWith("jane");
    expect(screen.getByText("4d")).toHaveAttribute("title", "4 days overdue");
  });

  it("keeps professional context visible in every overlapping relationship row", () => {
    const { container } = render(<RelationshipSidebar
      dataset={datasetWithOverlappingJane}
      currentDate="2026-08-27"
      selectedId="jane"
      onSelect={vi.fn()}
    />);

    expect(within(container).getAllByText("Product lead · Strategy · Arc Systems")).toHaveLength(4);
    for (const row of within(container).getAllByRole("button", { name: /jane doe/i })) {
      expect(row).toHaveAttribute("aria-current", "true");
    }
  });

  it("uses the exact compact empty-state labels", () => {
    const dataset: PeopleDataset = {
      ...datasetWithOverlappingJane,
      people: [datasetWithOverlappingJane.people[0]],
    };

    render(<RelationshipSidebar
      dataset={dataset}
      currentDate="2026-08-27"
      selectedId={null}
      onSelect={vi.fn()}
    />);

    expect(screen.getByText("You're caught up.")).toBeVisible();
    expect(screen.getByText("No recent conversations.")).toBeVisible();
    expect(screen.getByText("No targets yet.")).toBeVisible();
  });

  it("labels a never-contacted reconnect candidate instead of showing overdue days", () => {
    const never = makePerson({
      id: "never",
      name: "Never Met",
      desiredCadenceDays: 30,
      effectiveLastContact: undefined,
      strategicRelevance: "high",
    });

    render(
      <RelationshipSidebar
        currentDate="2026-08-29"
        dataset={{ ...datasetWithOverlappingJane, people: [...datasetWithOverlappingJane.people, never] }}
        onSelect={vi.fn()}
        selectedId={null}
      />,
    );

    const row = screen.getByRole("button", { name: /never met/i });
    expect(within(row).getByText("Never")).toBeVisible();
    expect(within(row).queryByText(/\dd$/)).not.toBeInTheDocument();
  });

  it("shows a count per section and drives the map filter from the section heading", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(
      <RelationshipSidebar
        activeFilter="all"
        currentDate="2026-08-27"
        dataset={datasetWithOverlappingJane}
        onFilterChange={onFilterChange}
        onSelect={vi.fn()}
        selectedId={null}
      />,
    );

    const innerCircle = screen.getByRole("button", { name: /inner circle/i });
    expect(within(innerCircle).getByText("1")).toBeVisible();
    expect(innerCircle).toHaveAttribute("aria-pressed", "false");

    await user.click(innerCircle);
    expect(onFilterChange).toHaveBeenCalledWith("inner-circle");
  });

  it("marks the active section and returns to all when it is pressed again", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(
      <RelationshipSidebar
        activeFilter="targets"
        currentDate="2026-08-27"
        dataset={datasetWithOverlappingJane}
        onFilterChange={onFilterChange}
        onSelect={vi.fn()}
        selectedId={null}
      />,
    );

    const targets = screen.getByRole("button", { name: /targets/i });
    expect(targets).toHaveAttribute("aria-pressed", "true");

    await user.click(targets);
    expect(onFilterChange).toHaveBeenCalledWith("all");
  });
});
