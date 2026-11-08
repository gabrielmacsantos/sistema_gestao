import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // better-sqlite3 is a native module; keep it out of the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // Photo uploads of receipts can be a few MB.
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
