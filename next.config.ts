import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/nutrition-calculator",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
