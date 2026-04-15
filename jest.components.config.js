const base = require("./jest.base.config");

module.exports = {
  ...base,
  displayName: "components",
  preset: "jest-expo",
  testMatch: [
    "<rootDir>/src/features/**/*.test.tsx",
    "<rootDir>/src/components/**/*.test.tsx",
    "<rootDir>/src/hooks/**/*.test.tsx",
    "<rootDir>/app/**/*.test.tsx",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|@testing-library|native-base|react-native-svg|zustand|expo-image|@shopify/flash-list)",
  ],
};
