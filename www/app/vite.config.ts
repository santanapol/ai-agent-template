import { defineConfig } from "vitest/config";
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    // Playwright lives under e2e/; do not let Vitest execute those files.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
})
