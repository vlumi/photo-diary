import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
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
    },
  },
  {
    files: ["tests/**/*.{js,ts}"],
    rules: {
      // Tests routinely mock partial objects via `as any` and assert on
      // shapes TS can't fully prove; relax these in test files rather
      // than dotting per-file disable comments around.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];
