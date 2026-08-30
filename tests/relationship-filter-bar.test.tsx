import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("clears the reset announcement after a few seconds", async () => {
    vi.useFakeTimers();
    try {
      render(
        <RelationshipFilterBar
          activeFilter="all"
          onFilterChange={vi.fn()}
          onResetLayout={vi.fn()}
        />,
      );

      const status = screen.getByRole("status");
      fireEvent.click(screen.getByRole("button", { name: "Reset layout" }));
      act(() => { vi.advanceTimersByTime(1); });
      expect(status).toHaveTextContent("Layout reset.");

      act(() => { vi.advanceTimersByTime(4000); });
      expect(status).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });

  it("blanks and re-announces an immediately repeated reset", async () => {
    const onResetLayout = vi.fn();
    render(
      <RelationshipFilterBar
        activeFilter="all"
        onFilterChange={vi.fn()}
        onResetLayout={onResetLayout}
      />,
    );

    const reset = screen.getByRole("button", { name: "Reset layout" });
    const status = screen.getByRole("status");

    fireEvent.click(reset);
    await waitFor(() => expect(status).toHaveTextContent("Layout reset."));

    // A repeated reset must blank the live region first, or assistive tech
    // reads nothing because the text never changed.
    fireEvent.click(reset);
    expect(status).toBeEmptyDOMElement();
    await waitFor(() => expect(status).toHaveTextContent("Layout reset."));
    expect(onResetLayout).toHaveBeenCalledTimes(2);
  });
});
