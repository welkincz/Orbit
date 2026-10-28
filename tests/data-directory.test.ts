import { cp, mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PEOPLE_DIRECTORY,
  assertStaticExportUsesSeedData,
  resolvePeopleDirectory,
} from "@/lib/data-directory";
import { loadPeopleFromDirectory } from "@/lib/markdown";

const CWD = "/work/orbit";

describe("resolvePeopleDirectory", () => {
  it("reads the shipped seed vault when ORBIT_DATA_DIR is unset or blank", () => {
    expect(resolvePeopleDirectory({}, CWD)).toBe(join(CWD, DEFAULT_PEOPLE_DIRECTORY));
    expect(resolvePeopleDirectory({ ORBIT_DATA_DIR: "  " }, CWD)).toBe(join(CWD, DEFAULT_PEOPLE_DIRECTORY));
  });

  it("uses an absolute ORBIT_DATA_DIR as given", () => {
    expect(resolvePeopleDirectory({ ORBIT_DATA_DIR: "/vault/people" }, CWD)).toBe("/vault/people");
  });

  it("resolves a relative ORBIT_DATA_DIR against the working directory", () => {
    expect(resolvePeopleDirectory({ ORBIT_DATA_DIR: "../vault/people" }, CWD)).toBe("/work/vault/people");
  });

  // .env.local values are not shell-expanded, so `~/` has to be handled here.
  it("expands a leading ~/ to the home directory", () => {
    expect(resolvePeopleDirectory({ ORBIT_DATA_DIR: "~/OrbitVault/people" }, CWD))
      .toBe(join(homedir(), "OrbitVault/people"));
  });
});

describe("assertStaticExportUsesSeedData", () => {
  it("allows a normal build to read a private vault", () => {
    expect(() => assertStaticExportUsesSeedData({ ORBIT_DATA_DIR: "/vault/people" })).not.toThrow();
  });

  it("allows a static export of the seed vault", () => {
    expect(() => assertStaticExportUsesSeedData({ ORBIT_STATIC_EXPORT: "1" })).not.toThrow();
  });

  it("refuses a static export that would publish a private vault", () => {
    expect(() => assertStaticExportUsesSeedData({ ORBIT_STATIC_EXPORT: "1", ORBIT_DATA_DIR: "/vault/people" }))
      .toThrow(/ORBIT_DATA_DIR/);
  });
});

describe("a vault outside the repository", () => {
  it("reports each record by its absolute path instead of a ../ path", async () => {
    const vault = await mkdtemp(join(tmpdir(), "orbit-vault-"));
    try {
      await cp(resolve(process.cwd(), "tests/fixtures/people-dir"), vault, { recursive: true });
      const dataset = await loadPeopleFromDirectory(vault, "2026-08-27");
      const maya = dataset.people.find((person) => person.id === "maya-patel")!;

      expect(maya.sourceRelativePath).toBe(join(vault, "maya-patel.md"));
    } finally {
      await rm(vault, { recursive: true, force: true });
    }
  });
});
