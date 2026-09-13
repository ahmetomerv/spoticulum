import js from "@eslint/js";
import react from "@eslint-react/eslint-plugin";
import globals from "globals";

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
  {
    ...react.configs.recommended,
    files: ["src/**/*.{js,jsx}"],
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Core ESLint cannot track JSX references in preserved legacy components.
      "no-unused-vars": "off",
      // These rules would require rewriting the preserved class components.
      "@eslint-react/no-access-state-in-setstate": "off",
      "@eslint-react/no-set-state-in-component-did-mount": "off",
      "@eslint-react/web-api-no-leaked-fetch": "off",
      "@eslint-react/web-api-no-leaked-timeout": "off",
    },
  },
  {
    files: ["src/platform/semantic-ui.jsx"],
    // This adapter must enhance the untouched legacy Popup trigger element.
    rules: { "@eslint-react/no-clone-element": "off" },
  },
  {
    files: ["src/components/CollectionCanvas/CollectionCanvas.js"],
    // Preserve the original algorithm's redundant initializers in this migration.
    rules: { "no-useless-assignment": "off" },
  },
];
