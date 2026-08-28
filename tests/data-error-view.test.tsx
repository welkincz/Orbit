import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataErrorView } from "@/components/errors/DataErrorView";
import { PeopleDataError } from "@/lib/people";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("DataErrorView", () => {
  it("shows actionable data diagnostics without a stack trace", () => {
    render(<DataErrorView error={new PeopleDataError("Invalid people data", {
      sourceRelativePath: "data/people/alex.md",
      issues: ["relationship_strength must be between 1 and 5"],
    })} />);

    expect(screen.getByRole("heading", { name: /couldn.t load your network/i })).toBeVisible();
    expect(screen.getByText("data/people/alex.md")).toBeVisible();
    expect(screen.getByText(/relationship_strength/)).toBeVisible();
    expect(screen.queryByText(/at DataErrorView/)).not.toBeInTheDocument();
  });
});
