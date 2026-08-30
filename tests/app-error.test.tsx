import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppError from "@/app/error";

describe("app error boundary", () => {
  it("offers recovery without leaking a stack trace", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const error = new Error("Open Markdown requires an absolute path");
    error.stack = "STACK_SENTINEL_DO_NOT_RENDER";

    render(<AppError error={error} reset={reset} />);

    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeVisible();
    expect(screen.getByText("Open Markdown requires an absolute path")).toBeVisible();
    expect(screen.queryByText("STACK_SENTINEL_DO_NOT_RENDER")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("falls back to generic text when the error has no message", () => {
    render(<AppError error={new Error("")} reset={vi.fn()} />);

    expect(screen.getByText(/unexpected error/i)).toBeVisible();
  });
});
