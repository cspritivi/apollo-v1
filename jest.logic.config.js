const base = require("./jest.base.config");

module.exports = {
  ...base,
  displayName: "logic",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/src/stores/**/*.test.ts",
    "<rootDir>/src/lib/**/*.test.ts",
    "<rootDir>/src/hooks/**/*.test.ts",
    "<rootDir>/src/features/**/*.test.ts",
  ],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  transformIgnorePatterns: ["node_modules/(?!(zustand))"],
};
