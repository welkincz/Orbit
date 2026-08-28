import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchCommand } from "@/components/search/SearchCommand";
import { NetworkWorkspace } from "@/components/network/NetworkWorkspace";
import type { PeopleDataset } from "@/types/person";
import { makePerson } from "./fixtures/people";

vi.mock("@/components/network/NetworkGraph", () => ({ NetworkGraph: () => null }));
vi.mock("@/components/people/RelationshipSidebar", () => ({ RelationshipSidebar: () => null }));
vi.mock("@/components/network/RefreshPeopleButton", () => ({
  RefreshPeopleButton: () => <button type="button">Refresh</button>,
}));

const people = [
  makePerson({ id: "self", name: "Charlie Guo", type: "self" }),
  makePerson({
    id: "maya-patel",
    name: "Maya Patel",
    role: "Director",
    team: "Platform Engineering",
    company: "Northstar Analytics",
    tags: ["data-platform"],
  }),
  makePerson({ id: "elise-warren", name: "Élise Warren", role: "Director", company: "Northstar Analytics" }),
  makePerson({ id: "elise-worthington", name: "Élise   Worthington", role: "Advisor" }),
];

const dataset: PeopleDataset = {
  people,
  selfId: "self",
  diagnostics: [],
  loadedAt: "2026-08-27T00:00:00.000Z",
};

describe("SearchCommand", () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("opens with Meta+K, filters, and selects with the keyboard", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<SearchCommand people={people} onSelect={onSelect} />);
    const opener = screen.getByRole("button", { name: /search/i });
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const input = await screen.findByRole("combobox", { name: /search people/i });
    await user.type(input, "Maya");

    expect(screen.getByText("Director · Platform Engineering · Northstar Analytics")).toBeVisible();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledWith("maya-patel");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("opens with Control+K and closes with Escape", async () => {
    const user = userEvent.setup();

    render(<SearchCommand people={people} onSelect={vi.fn()} />);
    const opener = screen.getByRole("button", { name: /search/i });
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(await screen.findByRole("dialog")).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("uses an accessible dialog, listbox, and active descendant while preserving browser shortcuts", async () => {
    const user = userEvent.setup();

    render(<SearchCommand people={people} onSelect={vi.fn()} />);
    const unrelatedShortcut = new KeyboardEvent("keydown", { key: "l", metaKey: true, cancelable: true });
    window.dispatchEvent(unrelatedShortcut);
    expect(unrelatedShortcut.defaultPrevented).toBe(false);

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const input = await screen.findByRole("combobox", { name: /search people/i });
    const listbox = screen.getByRole("listbox", { name: /people/i });

    expect(input).toHaveAttribute("aria-controls", listbox.id);
    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(input.getAttribute("aria-activedescendant")).toBeTruthy());
    expect(listbox).toHaveAttribute("aria-activedescendant", input.getAttribute("aria-activedescendant"));

    await user.type(input, "not-a-person");
    expect(screen.getByText("No people found.")).toBeVisible();
  });

  it("opens from its semantic trigger and resets an empty query when reopened", async () => {
    const user = userEvent.setup();

    render(<SearchCommand people={people} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /search/i }));
    const input = await screen.findByRole("combobox", { name: /search people/i });
    expect(screen.getByRole("option", { name: /charlie guo/i })).toBeVisible();

    await user.type(input, "nobody");
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: /search/i }));
    expect((await screen.findByRole("combobox", { name: /search people/i })).getAttribute("value")).toBe("");
  });

  it("returns focus to its opener after an outside dismissal", async () => {
    const user = userEvent.setup();

    render(<SearchCommand people={people} onSelect={vi.fn()} />);
    const opener = screen.getByRole("button", { name: /search/i });
    await user.click(opener);
    const overlay = document.querySelector<HTMLElement>("[data-state='open'][aria-hidden='true']");

    expect(overlay).not.toBeNull();
    await user.click(overlay!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("highlights the complete source text for accent-insensitive, whitespace-collapsed matches", async () => {
    const user = userEvent.setup();

    render(<SearchCommand people={people} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /search/i }));
    await user.type(await screen.findByRole("combobox", { name: /search people/i }), "elise worthington");

    expect(screen.getByText("Élise Worthington", { selector: "mark" })).toHaveTextContent(
      "Élise   Worthington",
      { normalizeWhitespace: false },
    );
  });

  it("uses the workspace selection callback to open the selected person's existing details", async () => {
    const user = userEvent.setup();

    render(<NetworkWorkspace currentDate="2026-08-27" initialDataset={dataset} />);
    await user.click(screen.getByRole("button", { name: /search/i }));
    await user.type(await screen.findByRole("combobox", { name: /search people/i }), "Maya");
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("heading", { name: "Maya Patel" })).toBeVisible();
  });
});
