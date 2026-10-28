import type { NextConfig } from "next";
import { assertStaticExportUsesSeedData } from "./src/lib/data-directory";

// The static export is the public demo. Fail the build rather than compile a
// private vault (ORBIT_DATA_DIR, often set in .env.local) into ./out.
assertStaticExportUsesSeedData();

// `ORBIT_STATIC_EXPORT=1` emits ./out for the Cloudflare deploy. It is opt-in
// because `output: "export"` is incompatible with `next start`, and leaving it
// always-on would quietly break `npm run start`.
//
// `dynamic = "force-static"` in app/page.tsx is unconditional: a production
// build should render the vault once, not per request. `next dev` ignores it
// and still re-reads data/people on every request.
const nextConfig: NextConfig = {
  ...(process.env.ORBIT_STATIC_EXPORT === "1"
    ? { output: "export" as const, images: { unoptimized: true } }
    : {}),
};

export default nextConfig;
