import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RelationshipSidebar } from "@/components/people/RelationshipSidebar";
import type { PeopleDataset } from "@/types/person";
import { makePerson } from "./fixtures/people";

const jane = makePerson({
  id: "jane",
  name: "Jane Doe",
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
});
