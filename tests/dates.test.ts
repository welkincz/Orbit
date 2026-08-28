import { describe, expect, it } from "vitest";
import { calendarDaysBetween, isISODate, todayISO } from "@/lib/dates";

describe("calendar date utilities", () => {
  it("counts calendar days across ordinary dates", () => {
    expect(calendarDaysBetween("2026-03-07", "2026-03-09")).toBe(2);
  });

  it("counts leap-day calendar boundaries", () => {
    expect(calendarDaysBetween("2024-02-28", "2024-03-01")).toBe(2);
  });

  it("formats the local calendar date without converting to UTC", () => {
    expect(todayISO(new Date(2026, 7, 27, 23, 59))).toBe("2026-08-27");
  });

  it("rejects impossible calendar dates", () => {
    expect(() => calendarDaysBetween("2026-02-30", "2026-03-01")).toThrow(/calendar date/i);
  });

  it("recognizes real ISO calendar dates", () => {
    expect(isISODate("2024-02-29")).toBe(true);
    expect(isISODate("2024-02-30")).toBe(false);
  });
});
