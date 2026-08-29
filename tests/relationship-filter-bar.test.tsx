import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RelationshipFilterBar } from "@/components/network/RelationshipFilterBar";

describe("RelationshipFilterBar", () => {
  afterEach(cleanup);

  it("exposes one pressed filter and sends filter and reset actions", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const onResetLayout = vi.fn();
    render(
      <RelationshipFilterBar
        activeFilter="all"
        onFilterChange={onFilterChange}
        onResetLayout={onResetLayout}
      />,
    );

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Targets" })).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onFilterChange).toHaveBeenCalledWith("reconnect");
    await user.click(screen.getByRole("button", { name: "Reset layout" }));
    expect(onResetLayout).toHaveBeenCalledOnce();
    expect(screen.getByText("Layout reset.")).toBeVisible();
  });
});
