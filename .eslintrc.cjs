module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "no-warning-comments": ["error", { terms: ["xxx"], location: "anywhere" }],
  },
  root: true,
};
