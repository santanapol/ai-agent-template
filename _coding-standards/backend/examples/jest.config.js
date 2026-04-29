'use strict';

/**
 * Jest config per ops.md → Coverage threshold.
 * Threshold: lines/statements ≥ 80, branches ≥ 70, functions ≥ 80.
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.js', '<rootDir>/test/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/app.js',
    '!src/server.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      branches: 70,
      functions: 80,
    },
  },
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10_000,
};
