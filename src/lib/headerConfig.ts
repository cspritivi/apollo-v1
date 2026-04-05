import { NativeStackNavigationOptions } from "@react-navigation/native-stack";

/**
 * Shared header configuration — single source of truth for all navigators.
 *
 * WHY CENTRALIZED:
 * The app has multiple navigators (root Stack, Home Stack, Products Stack,
 * Fabrics Stack) that all render headers. Without a shared config, header
 * styles drift across navigators. This module ensures every header looks
 * identical. Changing header appearance in one place updates the entire app.
 *
 * WHY ONLY STACK OPTIONS (no Tabs header):
 * Every tab uses a nested Stack navigator for its header — even single-screen
 * tabs like Fabrics. This guarantees all headers come from the same native-stack
 * component with identical defaults. The Tabs navigator's own header is never
 * shown (headerShown: false on all tabs).
 *
 * USAGE:
 * Spread `stackHeaderOptions` into screenOptions on every Stack navigator.
 */

/**
 * Stack navigator header options — used by every navigator in the app.
 */
export const stackHeaderOptions: NativeStackNavigationOptions = {
  headerTitleStyle: { fontWeight: "700" as const },
  // Consistent "Back" label on iOS — avoids showing the previous screen's
  // title (which can be long or confusing, e.g. "(tabs)") and decouples
  // E2E tests from specific screen titles.
  headerBackTitle: "Back",
};
