import { describe, expect, it } from "vitest";
import { headingId, titleCase } from "@/lib/format";

describe("titleCase", () => {
  it("capitalizes the first character", () => {
    expect(titleCase("high")).toBe("High");
    expect(titleCase("medium")).toBe("Medium");
  });

  it("leaves an already-capitalized value alone", () => {
    expect(titleCase("High")).toBe("High");
  });

  it("returns an empty string unchanged instead of throwing", () => {
    expect(titleCase("")).toBe("");
  });
});

describe("headingId", () => {
  it("slugifies a section title into a stable id", () => {
    expect(headingId("Why they matter")).toBe("why-they-matter-heading");
    expect(headingId("Recent conversations")).toBe("recent-conversations-heading");
  });

  it("collapses punctuation and repeated whitespace", () => {
    expect(headingId("Follow-up   notes!")).toBe("follow-up-notes-heading");
  });
});
