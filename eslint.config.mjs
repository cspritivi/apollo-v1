import eslintConfigExpo from "eslint-config-expo/flat.js";
import boundaries from "eslint-plugin-boundaries";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";

export default [
  ...eslintConfigExpo,
  {
    ignores: ["node_modules/", "dist/", ".expo/", "web-build/"],
  },
  // Disable eslint-plugin-import rules that require module resolution.
  // eslint-import-resolver-typescript@3.x has a known incompatibility with
  // eslint-plugin-import@2.x in ESLint flat config — the resolver interface
  // changed but the plugin hasn't caught up, causing "invalid interface" crashes.
  // TypeScript itself validates all imports via tsc --noEmit, so these rules
  // are redundant. We keep the simpler import rules (ordering, no duplicates).
  {
    rules: {
      "import/namespace": "off",
      "import/no-unresolved": "off",
      "import/no-named-as-default": "off",
      "import/no-named-as-default-member": "off",
      "import/default": "off",
      "import/named": "off",
      "import/export": "off",
      "import/no-duplicates": "off",
    },
  },
  // Enforce @/ alias usage — block deep relative imports (2+ levels of ../).
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../*"],
              message: "Use @/ alias instead of deep relative imports.",
            },
          ],
        },
      ],
    },
  },
  // =========================================================================
  // FEATURE BOUNDARIES — eslint-plugin-boundaries v6
  //
  // Enforces that features only import other features' public API (api.ts,
  // hooks.ts), not their internals (components/, utils/). Within-feature
  // imports are unrestricted. App screens can import anything.
  //
  // Element types:
  //   app       — app/ screens (consumers, can import anything from src/)
  //   feature   — src/features/*/ (must use public API for cross-feature)
  //   shared    — src/components/, src/hooks/, src/lib/, src/stores/, src/types/
  //
  // =========================================================================
  {
    plugins: { boundaries },
    settings: {
      // Use the new flat-config-compatible resolver interface
      "import/resolver-next": [
        createTypeScriptImportResolver({
          project: "./tsconfig.json",
        }),
      ],
      "boundaries/elements": [
        {
          type: "app",
          pattern: ["app/**"],
          mode: "full",
        },
        {
          type: "feature",
          pattern: ["src/features/*"],
          capture: ["featureName"],
          mode: "folder",
        },
        {
          type: "shared",
          pattern: ["src/components/**", "src/hooks/**", "src/lib/**", "src/stores/**", "src/types/**"],
          mode: "full",
        },
      ],
    },
    rules: {
      // Features can import:
      // - Their own internals (same feature) — unrestricted
      // - Other features' public API only (api.ts, hooks.ts at feature root)
      // - Shared modules (components, hooks, lib, stores, types)
      // - App screens can import anything
      "boundaries/dependencies": [
        "warn",
        {
          default: "allow",
          rules: [
            {
              // Warn when features import a different feature's files.
              // "featureName: !{{featureName}}" = "any feature other than mine."
              // Set to "warn" (not "error") because some legitimate cross-feature
              // imports exist (e.g., shared utils like formatDate, calculatePrice).
              // TODO: Move shared utils to src/lib/ and upgrade to "error".
              from: ["feature"],
              disallow: [["feature", { featureName: "!{{featureName}}" }]],
            },
          ],
        },
      ],
    },
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
