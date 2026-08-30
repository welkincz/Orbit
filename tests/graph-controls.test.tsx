import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GraphControls } from "@/components/network/GraphControls";

describe("GraphControls", () => {
  afterEach(cleanup);

  it("sends the reset action and announces it", async () => {
    const user = userEvent.setup();
    const onResetLayout = vi.fn();
    render(
      <GraphControls onResetLayout={onResetLayout} />,
    );

    await user.click(screen.getByRole("button", { name: "Reset layout" }));
    expect(onResetLayout).toHaveBeenCalledOnce();
    expect(screen.getByText("Layout reset.")).toBeVisible();
  });

  it("clears the reset announcement after a few seconds", async () => {
    vi.useFakeTimers();
    try {
      render(
        <GraphControls onResetLayout={vi.fn()} />,
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
      <GraphControls onResetLayout={onResetLayout} />,
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
