import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

interface PackageManifest {
  dependencies: Record<string, string>;
  engines?: { node?: string };
  scripts: Record<string, string>;
}

let manifest: PackageManifest;

beforeAll(async () => {
  manifest = JSON.parse(await readFile(resolve(process.cwd(), "package.json"), "utf8")) as PackageManifest;
});

describe("local runtime package configuration", () => {
  it.each(["dev", "start"])("binds npm run %s to the IPv4 loopback interface", (scriptName) => {
    expect(manifest.scripts[scriptName].split(/\s+/)).toEqual(
      expect.arrayContaining(["--hostname", "127.0.0.1"]),
    );
  });

  it("declares the supported Node runtime floor", () => {
    expect(manifest.engines).toEqual({ node: ">=22" });
  });
});
