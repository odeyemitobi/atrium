import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@atrium/seed", "@atrium/sdk"]
};

export default nextConfig;
