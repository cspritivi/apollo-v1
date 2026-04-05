import { Stack } from "expo-router";
import CartHeaderIcon from "../../../../src/components/CartHeaderIcon";
import { stackHeaderOptions } from "../../../../src/lib/headerConfig";

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
 * CART ICON:
 * This Stack sets headerShown: false at the tab level, so it must explicitly
 * include headerRight to carry the cart icon forward. The Tabs layout is the
 * canonical source of truth — this inclusion is required only because we
 * override the header configuration.
 *
 * HEADER STYLING:
 * All visual options come from src/lib/headerConfig.ts (shared config).
 *
 * INTERVIEW TALKING POINT:
 * "Each tab has its own Stack navigator, so navigation state is isolated per tab.
 * Pushing Order Detail in the Home tab doesn't affect the Products or Fabrics tabs.
 * Back buttons work automatically via React Navigation's stack behavior — no
 * manual headerLeft hacks or 'from' params needed."
 */

// Stable reference — avoids re-creating headerRight on every render
const CartHeaderRight = () => <CartHeaderIcon />;

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        ...stackHeaderOptions,
        // Cart icon — inherited from Tabs intent, required because this Stack
        // provides its own header (tab-level headerShown: false)
        headerRight: CartHeaderRight,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="orders" options={{ title: "My Orders" }} />
      <Stack.Screen name="order-detail" options={{ title: "Order Details" }} />
      <Stack.Screen name="saved-fabrics" options={{ title: "Saved Fabrics" }} />
      <Stack.Screen
        name="alteration-request"
        options={{ title: "Request Alteration" }}
      />
      <Stack.Screen
        name="alteration-detail"
        options={{ title: "Alteration Details" }}
      />
    </Stack>
  );
}
