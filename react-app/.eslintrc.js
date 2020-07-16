var module;
module.exports = {
  env: {
    browser: true,
    es2020: true,
    jest: true,
  },
  extends: ["eslint:recommended", "plugin:react/recommended"],
  settings: {
    react: {
      createClass: "createReactClass",
      pragma: "React", // Pragma to use, default to "React"
      version: "detect",
    },
    propWrapperFunctions: [
      "forbidExtraProps",
      { property: "freeze", object: "Object" },
      { property: "myFavoriteWrapper" },
    ],
    linkComponents: ["Hyperlink", { name: "Link", linkAttribute: "to" }],
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 11,
    sourceType: "module",
  },
  plugins: ["react"],
  rules: {
    indent: ["error", 2, { SwitchCase: 1, offsetTernaryExpressions: true }],
    "linebreak-style": ["error", "unix"],
    quotes: ["error", "double"],
    semi: ["error", "always"],
    eqeqeq: "error",
    "no-trailing-spaces": "error",
    "object-curly-spacing": ["error", "always"],
    "arrow-spacing": ["error", { before: true, after: true }],
  },
};
