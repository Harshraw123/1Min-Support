import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the floating "N" dev toolbar on /test and /embed (production builds never show it).
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
