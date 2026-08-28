import { describe, expect, it } from "vitest";
import { toVscodeFileHref } from "@/lib/local-files";

describe("toVscodeFileHref", () => {
  it("encodes absolute local paths for VS Code", () => {
    expect(toVscodeFileHref("/Users/Charlie/My Notes/a#b.md"))
      .toBe("vscode://file/Users/Charlie/My%20Notes/a%23b.md");
  });

  it("rejects relative paths", () => {
    expect(() => toVscodeFileHref("data/people/alex.md")).toThrow(/absolute path/i);
  });
});
