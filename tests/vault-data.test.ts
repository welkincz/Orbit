import { describe, expect, it } from "vitest";
import { resolvePeopleDirectory } from "@/lib/data-directory";
import { todayISO } from "@/lib/dates";
import { loadPeopleFromDirectory } from "@/lib/markdown";

// Validates a private vault after an edit. Vitest does not read .env.local, so
// run it with the variable set: ORBIT_DATA_DIR=~/OrbitVault/people npx vitest run tests/vault-data.test.ts
describe.runIf(Boolean(process.env.ORBIT_DATA_DIR?.trim()))("private vault", () => {
  it("loads and validates every record in ORBIT_DATA_DIR", async () => {
    const vault = await loadPeopleFromDirectory(resolvePeopleDirectory(), todayISO());

    expect(vault.people.filter((person) => person.type === "self")).toHaveLength(1);
  });
});
