"use strict";

/**
 * Coverage aligned with `_coding-standards/backend/examples/jest.config.js` and
 * `testing.md` §3.1: **lines** and **statements** ≥ 80% (merge gate). Branches/functions
 * thresholds are org **warn**-only — not enforced here until coverage rises.
 */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/server.js",
    "!src/app.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "json-summary"],
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
    },
  },
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10_000,
};
