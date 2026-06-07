import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phone/browser access via LAN IP during local dev
  allowedDevOrigins: ["192.168.*.*", "*.lan"],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "192.168.*.*:3000",
      ],
    },
  },
};

export default nextConfig;
