import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phones and tablets on the same local network to load the
  // development runtime and hydrate interactive controls.
  allowedDevOrigins: ["192.168.100.79"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/photos/**",
      },
    ],
  },
};

export default nextConfig;
