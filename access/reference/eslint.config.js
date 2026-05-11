const js = require("@eslint/js");
const globals = require("globals");
const nPlugin = require("eslint-plugin-n").default;
const securityPlugin = require("eslint-plugin-security");
const importPlugin = require("eslint-plugin-import");
const boundariesPlugin = require("eslint-plugin-boundaries");
const jestPlugin = require("eslint-plugin-jest");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  { ignores: ["node_modules/**", "coverage/**"] },
  js.configs.recommended,
  nPlugin.configs["flat/recommended-script"],
  importPlugin.flatConfigs.recommended,
  securityPlugin.configs.recommended,
  {
    files: ["**/*.js"],
    ignores: ["**/*.test.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
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
        { type: "validator", pattern: "src/modules/*/*.validator.js" },
        { type: "service", pattern: "src/modules/*/*.service.js" },
        { type: "repository", pattern: "src/modules/*/*.repository.js" },
        { type: "middleware", pattern: "src/middlewares/*.js" },
        { type: "adapter", pattern: "src/adapters/**/*.js" },
        { type: "config", pattern: "src/config/**/*.js" },
        { type: "util", pattern: "src/utils/**/*.js" },
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
      "no-await-in-loop": "warn",
      "require-await": "warn",
      "import/no-cycle": "error",
      "n/no-process-exit": "off",
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            { from: "route", allow: ["controller", "middleware"] },
            { from: "controller", allow: ["validator", "service", "util"] },
            { from: "validator", allow: ["util", "config"] },
            {
              from: "service",
              allow: ["service", "repository", "adapter", "util", "config"],
            },
            { from: "repository", allow: ["util", "config"] },
            { from: "middleware", allow: ["service", "util", "config"] },
          ],
        },
      ],
    },
  },
  {
    ...jestPlugin.configs["flat/recommended"],
    files: ["**/*.test.js", "**/tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      ...jestPlugin.configs["flat/recommended"].rules,
      "no-console": "off",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
    },
  },
  prettierConfig,
];
