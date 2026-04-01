import eslintConfigExpo from "eslint-config-expo/flat.js";

export default [
  ...eslintConfigExpo,
  {
    ignores: ["node_modules/", "dist/", ".expo/", "web-build/"],
  },
  // Relax rules for test files — jest mocking patterns require dynamic
  // imports and require() calls that violate normal import rules
  {
    files: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "import/first": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
];
