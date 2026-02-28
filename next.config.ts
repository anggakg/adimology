import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker: generates a minimal self-contained server in .next/standalone
  output: 'standalone',
  async headers() {
    return [
      // Static Next.js assets: cache forever (content-hashed filenames)
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // All page routes: never cache so browser always gets fresh HTML
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
