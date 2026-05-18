import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  // Ignored paths
  {
    ignores: [
      "build/**",
      ".react-router/**",
      "**/node_modules/**",
    ],
  },

  // JS recommended baseline for all files
  js.configs.recommended,

  // TypeScript rules for all .ts/.tsx files
  ...tseslint.configs.recommended,

  // Node.js globals for server and shared (no DOM, no browser)
  {
    files: ["server/**/*.ts", "shared/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Browser globals + React rules for the app/
  {
    files: ["app/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // React 17+ JSX transform
      "react/prop-types": "off",         // TypeScript covers this
    },
  },

  // Node globals for client store (no DOM — pure logic tested in Node)
  {
    files: ["client/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
);
