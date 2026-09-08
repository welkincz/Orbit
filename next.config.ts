import type { NextConfig } from "next";

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
