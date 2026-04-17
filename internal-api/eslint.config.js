import js from '@eslint/js'
import globals from 'globals'

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
    files: ['src/server.js'],
    rules: { 'no-console': 'off' }
  }
]
