import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The hosted copy is a static snapshot of whatever is committed to
  // data/people at build time. There is no vault behind a CDN to re-read,
  // so `next build` prerenders the page instead of rendering per request.
  // `next dev` is unaffected and still re-reads the directory every request.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
