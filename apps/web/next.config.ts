import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@atrium/seed", "@atrium/sdk"],
  experimental: {
    useTypeScriptCli: true
  }
};

export default nextConfig;
