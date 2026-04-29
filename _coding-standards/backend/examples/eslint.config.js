'use strict';

/**
 * ESLint flat config (eslint v9+) per supply-chain.md → ESLint base config.
 * - eslint:recommended + eslint-plugin-security + eslint-plugin-boundaries
 * - boundary: routes → controllers → services → repositories (no upward import)
 */

const js = require('@eslint/js');
const security = require('eslint-plugin-security');
const boundaries = require('eslint-plugin-boundaries');

module.exports = [
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { process: true, console: true, Buffer: true, __dirname: true, __filename: true },
    },
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app.js' },
        { type: 'route', pattern: 'src/modules/*/*.route.js' },
        { type: 'controller', pattern: 'src/modules/*/*.controller.js' },
        { type: 'service', pattern: 'src/modules/*/*.service.js' },
        { type: 'repository', pattern: 'src/modules/*/*.repository.js' },
        { type: 'validator', pattern: 'src/modules/*/*.validator.js' },
        { type: 'middleware', pattern: 'src/middlewares/*.js' },
        { type: 'config', pattern: 'src/config/*.js' },
        { type: 'util', pattern: 'src/utils/*.js' },
      ],
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-process-exit': 'off',
      'security/detect-object-injection': 'off',

      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'app', allow: ['route', 'middleware', 'config', 'util'] },
            { from: 'route', allow: ['controller', 'middleware', 'validator', 'util'] },
            { from: 'controller', allow: ['service', 'util'] },
            { from: 'service', allow: ['repository', 'util', 'config'] },
            { from: 'repository', allow: ['util', 'config'] },
            { from: 'middleware', allow: ['util', 'config'] },
            { from: 'validator', allow: ['util'] },
            { from: 'util', allow: ['util', 'config'] },
            { from: 'config', allow: ['util'] },
          ],
        },
      ],
    },
  },
];
