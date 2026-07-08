import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import path from "node:path";

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
  },
});
