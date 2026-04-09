/**
 * Shared Jest configuration — extended by jest.logic.config.js and
 * jest.components.config.js.
 *
 * Single source of truth for settings that must stay in sync across
 * both test projects (e.g., path alias mapping).
 */
module.exports = {
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^expo-image$": "<rootDir>/src/__mocks__/expo-image.tsx",
    "^@shopify/flash-list$": "<rootDir>/src/__mocks__/@shopify/flash-list.tsx",
  },
};
