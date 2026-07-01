// eslint pinned to major 9 in react-app. eslint-plugin-react (latest
// 7.37.5 as of 2026-07) caps its eslint peer at ^9.7 — bumping eslint
// to 10 crashes the plugin's version detector at load time
// ("TypeError: contextOrFilename.getFilename is not a function" from
// eslint-plugin-react/lib/util/version.js). Server + converter don't
// use eslint-plugin-react and are already on eslint 10; only react-app
// waits. Revisit when eslint-plugin-react ships a release with an
// eslint-10 peer.
import js from "@eslint/js";
import react from "eslint-plugin-react";
import globals from "globals";

export default [
  {
    ignores: ["build/", "node_modules/", "public/"],
  },
  js.configs.recommended,
  react.configs.flat.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { caughtErrors: "none", argsIgnorePattern: "^_" },
      ],
      indent: ["error", 2, { SwitchCase: 1 }],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      eqeqeq: "error",
      "no-trailing-spaces": "error",
      "object-curly-spacing": ["error", "always"],
      "arrow-spacing": ["error", { before: true, after: true }],
      "no-console": "error",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  {
    files: ["**/*.test.{js,jsx}", "src/setupTests.js"],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },
];
