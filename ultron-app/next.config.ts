import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/api/uploads",
      },
      {
        pathname: "/ultron/**",
      },
    ],
  },
};

export default nextConfig;