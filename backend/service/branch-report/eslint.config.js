import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import nodePlugin from 'eslint-plugin-node';
import promisePlugin from 'eslint-plugin-promise';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      node: nodePlugin,
      promise: promisePlugin,
    },
    rules: {
      'no-console': ['error', { allow: ['error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['node_modules/**'],
  },
];
