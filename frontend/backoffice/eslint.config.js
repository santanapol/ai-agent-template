import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // shadcn/ui exports variants alongside components; TanStack Table triggers incompatible-library warnings
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/components/ui/**', 'src/hooks/useConfirmDialog.tsx', 'src/contexts/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);
