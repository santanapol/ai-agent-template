import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Ant Design table + debounced search tests exceed 5s under parallel load.
    testTimeout: 10_000,
    pool: 'forks',
  },
});
