import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  // Legacy pages still in flux — don't block builds on type errors.
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "synapse-videos.s3.ap-south-1.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.s3.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
