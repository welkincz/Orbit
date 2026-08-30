import { describe, expect, it } from "vitest";
import { toVscodeFileHref } from "@/lib/local-files";

describe("toVscodeFileHref", () => {
  it("encodes absolute POSIX paths for VS Code", () => {
    expect(toVscodeFileHref("/Users/Charlie/My Notes/a#b.md"))
      .toBe("vscode://file/Users/Charlie/My%20Notes/a%23b.md");
  });

  it("encodes Windows drive paths for VS Code", () => {
    expect(toVscodeFileHref("C:\\Users\\Charlie\\Orbit\\data\\people\\alex rivera.md"))
      .toBe("vscode://file/C:/Users/Charlie/Orbit/data/people/alex%20rivera.md");
  });

  it("encodes Windows UNC paths for VS Code", () => {
    expect(toVscodeFileHref("\\\\server\\share\\alex.md"))
      .toBe("vscode://file//server/share/alex.md");
  });

  it("returns null for relative paths instead of throwing", () => {
    expect(toVscodeFileHref("data/people/alex.md")).toBeNull();
  });

  it("returns null for an empty path", () => {
    expect(toVscodeFileHref("")).toBeNull();
  });
});
