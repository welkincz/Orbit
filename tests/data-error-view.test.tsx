import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataErrorView } from "@/components/errors/DataErrorView";
import { aggregatePeopleDataErrors, PeopleDataError } from "@/lib/people";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("DataErrorView", () => {
  afterEach(cleanup);

  it("shows actionable data diagnostics without a stack trace", () => {
    const error = new PeopleDataError("Invalid people data", {
      sourceRelativePath: "data/people/alex.md",
      issues: ["relationship_strength must be between 1 and 5"],
    });
    error.stack = "STACK_SENTINEL_DO_NOT_RENDER";

    render(<DataErrorView error={error} />);

    expect(screen.getByRole("heading", { name: /couldn.t load your network/i })).toBeVisible();
    expect(screen.getByText("data/people/alex.md")).toBeVisible();
    expect(screen.getByText(/relationship_strength/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
    expect(screen.queryByText(/at DataErrorView/)).not.toBeInTheDocument();
    expect(screen.queryByText("STACK_SENTINEL_DO_NOT_RENDER")).not.toBeInTheDocument();
  });

  it("lists every broken file so all of them can be fixed in one pass", () => {
    const error = aggregatePeopleDataErrors([
      new PeopleDataError("Invalid person frontmatter", {
        sourceRelativePath: "data/people/alex.md",
        issues: ["strategic_relevance: is required for a person"],
      }),
      new PeopleDataError("Invalid person frontmatter", {
        sourceRelativePath: "data/people/robin.md",
        issues: ["id: must be a lowercase slug", "name: too small"],
      }),
    ]);

    render(<DataErrorView error={error} />);

    expect(screen.getByText("data/people/alex.md")).toBeVisible();
    expect(screen.getByText("data/people/robin.md")).toBeVisible();
    expect(screen.getByText(/strategic_relevance/)).toBeVisible();
    expect(screen.getByText(/lowercase slug/)).toBeVisible();
    expect(screen.getByText(/too small/)).toBeVisible();
    expect(screen.getByText(/2 files/i)).toBeVisible();
  });
});
