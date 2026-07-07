import js from '@eslint/js'
import globals from 'globals'
import {
  harnessMaxLinesConfig,
  harnessNoConsoleConfig
} from '../shared/eslint-rules/harness-taste.mjs'

export default [
  { ignores: ['node_modules/**'] },
  {
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['test/**/*.test.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest }
    }
  },
  {
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' }
  },
  ...harnessNoConsoleConfig('error'),
  ...harnessMaxLinesConfig('error')
]
