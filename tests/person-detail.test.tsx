import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PersonDetail } from "@/components/people/PersonDetail";
import { makePerson } from "./fixtures/people";

const introducer = makePerson({ id: "elise", name: "Elise Warren" });
const maya = makePerson({
  id: "maya",
  name: "Maya Patel",
  role: "Director",
  team: "Platform Engineering",
  company: "Northstar Analytics",
  relationshipStrength: 5,
  strategicRelevance: "high",
  effectiveLastContact: "2026-08-18",
  introducedBy: "elise",
  interactions: [
    { date: "2026-08-18", kind: "Coffee chat", markdown: "Discussed platform ownership." },
    { date: "2026-04-03", kind: "Walk", markdown: "Discussed operating models." },
  ],
  sections: {
    whyTheyMatter: "Maya gives candid platform leadership advice.",
    context: "Met through a cross-team architecture forum.",
    followUp: "Send the platform RFC article",
  },
  sourcePath: "/Users/Charlie/Orbit/data/people/maya.md",
});

describe("PersonDetail", () => {
  afterEach(cleanup);

  it("shows a progressive person narrative and local-file actions", () => {
    render(<PersonDetail person={maya} people={[maya, introducer]} onSelectPerson={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Maya Patel" })).toBeVisible();
    expect(screen.getByText("Director · Platform Engineering")).toBeVisible();
    expect(screen.getByText("Northstar Analytics")).toBeVisible();
    expect(screen.getByText("5 of 5")).toBeVisible();
    expect(screen.getByText("High")).toBeVisible();
    expect(within(screen.getByText("Last contact").parentElement!).getByText("August 18, 2026")).toBeVisible();
    expect(screen.getByText("2 interactions")).toBeVisible();
    expect(screen.getByRole("button", { name: "Elise Warren" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Why they matter" })).toBeVisible();
    expect(screen.getByText("Maya gives candid platform leadership advice.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Latest interaction" })).toBeVisible();
    expect(screen.getByText("Coffee chat")).toBeVisible();
    expect(screen.getAllByText("Send the platform RFC article")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Open Markdown" })).toHaveAttribute(
      "href",
      "vscode://file/Users/Charlie/Orbit/data/people/maya.md",
    );
    expect(screen.getByRole("button", { name: "Copy path" })).toBeVisible();
  });

  it("closes and follows the introducer through the shared selection callback", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSelectPerson = vi.fn();

    render(<PersonDetail person={maya} people={[maya, introducer]} onSelectPerson={onSelectPerson} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Elise Warren" }));
    expect(onSelectPerson).toHaveBeenCalledWith("elise");
    await user.click(screen.getByRole("button", { name: "Close details" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("copies the absolute source path and announces success", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<PersonDetail person={maya} people={[maya, introducer]} onSelectPerson={vi.fn()} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Copy path" }));
    expect(writeText).toHaveBeenCalledWith("/Users/Charlie/Orbit/data/people/maya.md");
    expect(screen.getByText("Path copied.")).toBeVisible();
  });
});
