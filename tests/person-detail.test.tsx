import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarkdownSection } from "@/components/people/MarkdownSection";
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
  conversationPrep: {
    theirWorld: "Maya's team is clarifying platform ownership.",
    whatTheyCareAbout: "- Clear decision rights\n- Practical operating models",
    remember: "Charlie promised to send the platform RFC article.",
    nextConversation: "- Ask how the ownership discussion landed",
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

  it("puts actionable Conversation Prep before interaction history", async () => {
    const user = userEvent.setup();
    render(<PersonDetail person={maya} people={[maya, introducer]} onSelectPerson={vi.fn()} onClose={vi.fn()} />);

    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);
    expect(headings.indexOf("Next conversation")).toBeLessThan(headings.indexOf("Latest interaction"));
    expect(screen.getByText("Ask how the ownership discussion landed")).toBeVisible();
    expect(screen.getByText("Maya's team is clarifying platform ownership.")).toBeVisible();
    await user.click(screen.getByText("What they care about"));
    expect(screen.getByText("Clear decision rights")).toBeVisible();
    await user.click(screen.getByText("Remember"));
    expect(screen.getByText("Charlie promised to send the platform RFC article.")).toBeVisible();
  });

  it("omits empty prep blocks and copies the template when all prep is empty", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const empty = makePerson({ id: "empty", name: "Empty Prep" });

    render(<PersonDetail person={empty} people={[empty]} onSelectPerson={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole("heading", { name: "Their world" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy Conversation Prep template" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("## Conversation Prep"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("### Next conversation"));
    expect(screen.getByText("Template copied.")).toBeVisible();
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

  it("clears copied-path feedback when navigation changes the person", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const alex = makePerson({ id: "alex", name: "Alex Rivera", sourcePath: "/Users/Charlie/Orbit/data/people/alex.md" });
    const { rerender } = render(<PersonDetail person={maya} people={[maya, introducer, alex]} onSelectPerson={vi.fn()} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Copy path" }));
    expect(screen.getByText("Path copied.")).toBeVisible();

    rerender(<PersonDetail person={alex} people={[maya, introducer, alex]} onSelectPerson={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText("Path copied.")).not.toBeInTheDocument();
  });

  it("announces clipboard failures", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("Denied"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<PersonDetail person={maya} people={[maya, introducer]} onSelectPerson={vi.fn()} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Copy path" }));
    expect(screen.getByText("Couldn’t copy path.")).toBeVisible();
  });

  it("unwraps unsupported Markdown without rendering remote images", () => {
    const { container } = render(
      <MarkdownSection
        markdown={"# Hidden heading\n\n> Quoted context\n\n![Tracking image](https://example.test/tracker.png)"}
        title="Safety"
      />,
    );

    expect(screen.getByText("Hidden heading")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Hidden heading" })).not.toBeInTheDocument();
    expect(screen.getByText("Quoted context")).toBeVisible();
    expect(container.querySelector("blockquote")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});
