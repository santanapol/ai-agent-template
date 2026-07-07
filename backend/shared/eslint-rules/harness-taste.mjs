/**
 * Harness engineering taste rules — shared ESLint flat config fragments.
 * See docs/golden-principles.md
 */

/** @returns {import('eslint').Linter.Config[]} */
export function harnessMaxLinesConfig(level = 'warn', max = 400) {
  return [
    {
      files: ['src/**/*.js'],
      ignores: ['**/*.test.js', '**/tests/**'],
      rules: {
        'max-lines': [
          level,
          {
            max,
            skipBlankLines: true,
            skipComments: true,
          },
        ],
      },
    },
  ];
}

/**
 * Structured logging — use project logger, not console.
 * Start as warn; promote to error per service when violations cleared.
 * @returns {import('eslint').Linter.Config[]}
 */
export function harnessNoConsoleConfig(level = 'warn') {
  return [
    {
      files: ['src/**/*.js'],
      ignores: ['**/*.test.js', '**/tests/**', 'scripts/**'],
      rules: {
        'no-console': level,
      },
    },
  ];
}

/** @returns {import('eslint').Linter.Config[]} */
export function harnessTasteConfigs(options = {}) {
  const { consoleLevel = 'warn', maxLinesLevel = 'warn' } = options;
  return [
    ...harnessNoConsoleConfig(consoleLevel),
    ...harnessMaxLinesConfig(maxLinesLevel),
  ];
}
