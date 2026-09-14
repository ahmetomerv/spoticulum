import js from "@eslint/js";
import react from "@eslint-react/eslint-plugin";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...react.configs.recommended,
    files: ["src/**/*.{ts,tsx}"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      // These rules would require rewriting the preserved class components.
      "@eslint-react/no-access-state-in-setstate": "off",
      "@eslint-react/no-set-state-in-component-did-mount": "off",
      "@eslint-react/web-api-no-leaked-fetch": "off",
      "@eslint-react/web-api-no-leaked-timeout": "off",
    },
  },
  {
    files: ["src/platform/semantic-ui.tsx"],
    // This adapter must enhance the untouched legacy Popup trigger element.
    rules: { "@eslint-react/no-clone-element": "off" },
  },
  {
    files: ["src/components/CollectionCanvas/CollectionCanvas.tsx"],
    // Preserve the original algorithm's redundant initializers in this migration.
    rules: { "no-useless-assignment": "off" },
  },
  {
    files: ["vite.config.ts", "playwright.config.ts", "e2e/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
];
