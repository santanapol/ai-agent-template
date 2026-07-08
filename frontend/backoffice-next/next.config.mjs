/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authTarget = process.env.AUTH_PROXY_TARGET ?? "http://127.0.0.1:3001";
const gatewayTarget = process.env.GATEWAY_PROXY_TARGET ?? "http://127.0.0.1:3000";
const rolesEntry = path.join(__dirname, "../../backend/shared/platform-roles/index.js");

const nextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@zero-platform/roles"],
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  turbopack: {
    resolveAlias: {
      "@zero-platform/roles": rolesEntry,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@zero-platform/roles": rolesEntry,
    };
    return config;
  },
  async rewrites() {
    return [
      { source: "/auth/:path*", destination: `${authTarget}/auth/:path*` },
      { source: "/api/:path*", destination: `${gatewayTarget}/api/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
