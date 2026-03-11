/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["next/core-web-vitals", "eslint:recommended"],
  rules: {
    "no-unused-vars": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "prefer-const": "error",
  },
  ignorePatterns: ["node_modules/", ".next/", "dist/"],
};
