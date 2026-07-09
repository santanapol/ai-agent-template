import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import path from "node:path";

const lowResource = process.env.CI_LOW_RESOURCE === "1";
const maxWorkers = process.env.VITEST_MAX_WORKERS
  ? Number.parseInt(process.env.VITEST_MAX_WORKERS, 10)
  : lowResource
    ? 1
    : undefined;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "geist/font/pixel": path.resolve(__dirname, "./src/test/mocks/geist-pixel.ts"),
      "next/font/google": path.resolve(__dirname, "./src/test/mocks/next-font-google.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    pool: (process.env.VITEST_POOL as "forks" | "threads" | "vmThreads" | undefined) ?? "forks",
    maxWorkers: Number.isFinite(maxWorkers) ? maxWorkers : undefined,
    fileParallelism: lowResource ? false : undefined,
  },
});
