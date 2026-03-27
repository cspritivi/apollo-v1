import { Stack } from "expo-router";

/**
 * Home Stack Layout — nested Stack navigator inside the Home tab.
 *
 * WHY NESTED STACKS INSIDE TABS:
 * The flat Tabs approach (href: null for pushed screens) broke back navigation —
 * router.back() didn't maintain a proper stack, so Home → Orders → Order Detail
 * → Back would skip Orders and jump to Home. Nested Stacks give each tab its own
 * navigation stack with automatic back button behavior, matching the standard
 * pattern used in production React Native apps.
 *
 * SCREENS IN THIS STACK:
 * - index: Home dashboard (initial screen)
 * - orders: Full orders list (pushed from Home)
 * - order-detail: Single order view (pushed from Home or Orders)
 * - saved-fabrics: Bookmarked fabrics (pushed from Home)
 *
 * INTERVIEW TALKING POINT:
 * "Each tab has its own Stack navigator, so navigation state is isolated per tab.
 * Pushing Order Detail in the Home tab doesn't affect the Products or Fabrics tabs.
 * Back buttons work automatically via React Navigation's stack behavior — no
 * manual headerLeft hacks or 'from' params needed."
 */
export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: "700" },
        // Override the default iOS back button label (which shows the previous
        // screen's title) with a consistent "Back" label. This avoids coupling
        // E2E tests to specific screen titles and keeps the header clean.
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="orders" options={{ title: "My Orders" }} />
      <Stack.Screen name="order-detail" options={{ title: "Order Details" }} />
      <Stack.Screen name="saved-fabrics" options={{ title: "Saved Fabrics" }} />
    </Stack>
  );
}
