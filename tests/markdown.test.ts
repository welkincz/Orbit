import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  extractMarkdownSections,
  loadPeopleFromDirectory,
  parsePersonMarkdown,
} from "@/lib/markdown";
import { PeopleDataError } from "@/lib/people";

const fixtureDirectory = dirname(fileURLToPath(import.meta.url));
const validFixturePath = join(fixtureDirectory, "fixtures/markdown/maya-patel.md");
const invalidFixturePath = join(fixtureDirectory, "fixtures/markdown/invalid-contact.md");
const temporaryDirectories: string[] = [];

let validSource = "";

const options = {
  absolutePath: "/repo/tests/fixtures/markdown/maya-patel.md",
  relativePath: "tests/fixtures/markdown/maya-patel.md",
  currentDate: "2026-08-27" as const,
};

const selfSource = `---
id: charlie
name: Charlie
type: self
---

# Charlie
`;

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "orbit-markdown-"));
  temporaryDirectories.push(directory);
  return directory;
}

beforeAll(async () => {
  validSource = await readFile(validFixturePath, "utf8");
});

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("Markdown people data", () => {
  it("extracts interactions and keeps Follow up out of the latest interaction", () => {
    const person = parsePersonMarkdown(validSource, options);

    expect(person.interactions).toHaveLength(2);
    expect(person.interactions[0]).toMatchObject({ date: "2026-08-18", kind: "Coffee chat" });
    expect(person.interactions[0].markdown).toContain("- Platform ownership\n- Hiring signals");
    expect(person.interactions[0].markdown).not.toContain("Send the platform RFC article");
    expect(person.sections.followUp).toContain("Send the platform RFC article");
    expect(person.sections.whyTheyMatter).toContain("candid platform leadership advice");
  });

  it("uses frontmatter last_contact and warns when an interaction is newer", () => {
    const sourceWithNewerInteraction = validSource
      .replace("### 2026-08-18 — Coffee chat", "### 2026-08-20 — Coffee chat");

    const person = parsePersonMarkdown(sourceWithNewerInteraction, options);

    expect(person.effectiveLastContact).toBe("2026-08-18");
    expect(person.diagnostics).toContainEqual(expect.objectContaining({ code: "last-contact-mismatch" }));
  });

  it("derives effective last contact when frontmatter omits it", () => {
    const sourceWithoutLastContact = validSource.replace("last_contact: 2026-08-18\n", "");

    expect(parsePersonMarkdown(sourceWithoutLastContact, options).effectiveLastContact).toBe("2026-08-18");
  });

  it("uses AST heading boundaries and preserves original Markdown", () => {
    const markdown = `## Interactions

### 2026-08-18 - Review

Keep **this emphasis**.

### Notes

This unknown block does not belong to the interaction.

### FOLLOW-UP

- Preserve \`inline code\`

# Outside the person section

Do not capture this.
`;

    const extracted = extractMarkdownSections(markdown);

    expect(extracted.interactions).toEqual([
      { date: "2026-08-18", kind: "Review", markdown: "Keep **this emphasis**." },
    ]);
    expect(extracted.sections.followUp).toBe("- Preserve \`inline code\`");
  });

  it("sorts interactions newest-first while retaining source order for equal dates", () => {
    const markdown = `## Interactions

### 2026-04-03 — Older

Old.

### 2026-08-18 — First same-day

First.

### 2026-08-18 — Second same-day

Second.
`;

    expect(extractMarkdownSections(markdown).interactions.map(({ kind }) => kind))
      .toEqual(["First same-day", "Second same-day", "Older"]);
  });

  it("rejects impossible interaction dates with file diagnostics", () => {
    const source = validSource.replace("2026-08-18 — Coffee chat", "2026-02-30 — Coffee chat");

    try {
      parsePersonMarkdown(source, options);
      throw new Error("Expected parsing to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(PeopleDataError);
      expect(error).toMatchObject({ sourceRelativePath: options.relativePath });
      expect((error as PeopleDataError).issues).toContainEqual(expect.stringMatching(/2026-02-30.*calendar date/i));
    }
  });

  it("rejects impossible frontmatter last_contact dates with file diagnostics", () => {
    const source = validSource.replace("last_contact: 2026-08-18", "last_contact: 2026-02-30");

    try {
      parsePersonMarkdown(source, options);
      throw new Error("Expected parsing to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(PeopleDataError);
      expect(error).toMatchObject({ sourceRelativePath: options.relativePath });
      expect((error as PeopleDataError).issues).toContainEqual(expect.stringMatching(/last_contact.*calendar date/i));
    }
  });

  it("loads sorted direct Markdown children and ignores nested and non-Markdown files", async () => {
    const directory = await temporaryDirectory();
    await writeFile(join(directory, "a-self.md"), selfSource);
    await copyFile(validFixturePath, join(directory, "z-maya.md"));
    await writeFile(join(directory, "notes.txt"), "not frontmatter");
    await mkdir(join(directory, "nested"));
    await copyFile(invalidFixturePath, join(directory, "nested/invalid.md"));

    const dataset = await loadPeopleFromDirectory(directory, "2026-08-27");

    expect(dataset.people.map(({ id }) => id)).toEqual(["charlie", "maya-patel"]);
    expect(dataset.selfId).toBe("charlie");
  });

  it("reports invalid direct-child fixtures as file-specific PeopleDataError", async () => {
    const directory = await temporaryDirectory();
    await copyFile(invalidFixturePath, join(directory, "invalid-contact.md"));

    try {
      await loadPeopleFromDirectory(directory, "2026-08-27");
      throw new Error("Expected loading to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(PeopleDataError);
      expect(error).toMatchObject({ sourceRelativePath: expect.stringContaining("invalid-contact.md") });
      expect((error as PeopleDataError).issues.join(" ")).toMatch(/strategic_relevance/i);
    }
  });

  it("validates the parsed collection", async () => {
    const directory = await temporaryDirectory();
    await copyFile(validFixturePath, join(directory, "maya.md"));

    await expect(loadPeopleFromDirectory(directory, "2026-08-27"))
      .rejects.toThrow(/expected exactly one type: self record/i);
  });

  it("rejects an empty directory with one concise issue", async () => {
    const directory = await temporaryDirectory();

    try {
      await loadPeopleFromDirectory(directory, "2026-08-27");
      throw new Error("Expected loading to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(PeopleDataError);
      expect((error as PeopleDataError).issues).toEqual(["No Markdown files found."]);
    }
  });
});
