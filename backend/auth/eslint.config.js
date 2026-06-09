import js from '@eslint/js'
import globals from 'globals'
import security from 'eslint-plugin-security'

export default [
  { ignores: ['node_modules/**', 'coverage/**'] },
  {
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node }
    },
    plugins: { security },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-object-injection': 'off',
      'security/detect-possible-timing-attacks': 'warn'
    }
  }
]
