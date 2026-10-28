import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const DEFAULT_PEOPLE_DIRECTORY = "data/people";

type OrbitEnv = Record<string, string | undefined>;

function configuredDirectory(env: OrbitEnv): string | undefined {
  return env.ORBIT_DATA_DIR?.trim() || undefined;
}

/**
 * Real relationship records live outside the repository, in the directory named
 * by ORBIT_DATA_DIR. Without it, Orbit reads the fictional seed vault, which is
 * the only data that can ever be committed or deployed.
 */
export function resolvePeopleDirectory(env: OrbitEnv = process.env, cwd = process.cwd()): string {
  const configured = configuredDirectory(env);
  if (!configured) return resolve(cwd, DEFAULT_PEOPLE_DIRECTORY);
  // .env.local values are not shell-expanded, so `~/` has to be handled here.
  if (configured === "~" || configured.startsWith("~/")) return join(homedir(), configured.slice(1));
  return resolve(cwd, configured);
}

/** A static export is the public demo; it must never be built from a private vault. */
export function assertStaticExportUsesSeedData(env: OrbitEnv = process.env): void {
  if (env.ORBIT_STATIC_EXPORT === "1" && configuredDirectory(env)) {
    throw new Error(
      "Refusing a static export while ORBIT_DATA_DIR is set: the export would publish private records. "
      + "Unset ORBIT_DATA_DIR (and remove it from .env.local) or deploy with `npm run deploy`.",
    );
  }
}
