import js from "@eslint/js";
import globals from "globals";
import nPlugin from "eslint-plugin-n";
import securityPlugin from "eslint-plugin-security";
import importPlugin from "eslint-plugin-import";
import boundariesPlugin from "eslint-plugin-boundaries";
import prettierConfig from "eslint-config-prettier";

export default [
  { ignores: ["node_modules/**", "coverage/**", "scripts/**", "rename_docs.cjs"] },
  js.configs.recommended,
  nPlugin.configs["flat/recommended"],
  importPlugin.flatConfigs.recommended,
  securityPlugin.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      boundaries: boundariesPlugin,
    },
    settings: {
      "boundaries/elements": [
        { type: "route", pattern: "src/modules/*/*.route.js" },
        { type: "controller", pattern: "src/modules/*/*.controller.js" },
        { type: "schema", pattern: "src/modules/*/*.schema.js" },
        { type: "service", pattern: "src/modules/*/*.service.js" },
        { type: "repository", pattern: "src/modules/*/*.repository.js" },
        { type: "plugin", pattern: "src/plugins/**/*.js" },
        { type: "config", pattern: "src/config/**/*.js" },
        { type: "lib", pattern: "src/lib/**/*.js" },
      ],
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: "error",
      camelcase: ["error", { properties: "never" }],
      "no-console": "error",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "import/no-cycle": "error",
      "n/no-process-exit": "off",
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            { from: "route", allow: ["controller", "plugin", "schema"] },
            { from: "controller", allow: ["schema", "service", "lib"] },
            { from: "schema", allow: ["lib", "config"] },
            {
              from: "service",
              allow: ["service", "repository", "lib", "config"],
            },
            { from: "repository", allow: ["lib", "config"] },
            { from: "plugin", allow: ["service", "lib", "config"] },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.test.js", "**/tests/**/*.js"],
    rules: {
      "no-console": "off",
      "security/detect-object-injection": "off",
      "n/no-unsupported-features/node-builtins": "off",
    },
  },
  prettierConfig,
];
