import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Vercel builds should fail on a type error, not ship a broken page.
  // (Next 16 removed the `eslint` config key; linting runs via `npm run lint`
  // in CI instead.)
  typescript: { ignoreBuildErrors: false },

  images: {
    // AVIF first: roughly 20–30% smaller than WebP on the dark, low-noise
    // product photography this site is built for.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
    deviceSizes: [420, 640, 828, 1080, 1280, 1600, 1920, 2560, 3200],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  experimental: {
    // Import only the icons actually used instead of the whole barrel file.
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  // Security headers are set in middleware.ts so they apply uniformly and can
  // vary by path. Only the cache policy for immutable assets lives here.
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
