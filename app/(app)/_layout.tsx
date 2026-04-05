import { Stack } from "expo-router";
import Toast from "react-native-toast-message";
import { stackHeaderOptions } from "@/lib/headerConfig";

/**
 * App Group Layout — Stack navigator wrapping the entire authenticated area.
 *
 * ARCHITECTURE: ROOT STACK ABOVE TABS
 * This Stack contains three screens:
 * - (tabs): The tab bar with Home, Fabrics, Products
 * - cart: Pushed on top of tabs (tab bar disappears)
 * - order-success: Replaces cart after checkout
 *
 * WHY A STACK ABOVE TABS:
 * Cart was previously a tab, wasting a slot on a screen visited only at checkout.
 * Moving it to a Stack screen above the tabs means:
 * 1. Cart is accessible from any screen via a header icon
 * 2. Tab bar hides when cart is open (standard push behavior)
 * 3. Back button returns to wherever the user was in the tabs
 * 4. Three tabs remain: Home, Fabrics, Products — no wasted space
 *
 * HEADER STYLING:
 * All header options come from src/lib/headerConfig.ts — the single source of
 * truth for header appearance across the entire app. This Stack's screenOptions
 * apply to cart and order-success; the (tabs) screen hides the Stack header and
 * provides its own via the Tabs/nested Stack navigators (which also use the
 * shared config).
 *
 * INTERVIEW TALKING POINT:
 * "We restructured from a 4-tab layout to a 3-tab layout with cart as a
 * Stack screen above the tabs. This matches the Amazon/Nike pattern where
 * the cart is a header icon, not a tab. The (tabs) route group keeps URLs
 * clean — /fabrics not /tabs/fabrics — while giving us a Stack navigator
 * that can push cart and order-success on top of the entire tab bar."
 */
export default function AppLayout() {
  return (
    <>
      <Stack screenOptions={stackHeaderOptions}>
        {/* Tabs group — provides its own headers, so we hide the Stack header */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Cart — pushed on top of tabs from any screen via CartHeaderIcon.
            headerRight is null to hide the cart icon during checkout. */}
        <Stack.Screen
          name="cart"
          options={{
            title: "Cart",
            headerRight: () => null,
          }}
        />

        {/* Order success — replaces cart after checkout via router.replace().
            headerRight is null to hide the cart icon during checkout. */}
        <Stack.Screen
          name="order-success"
          options={{
            title: "Order Placed",
            headerRight: () => null,
          }}
        />
      </Stack>

      {/* Toast overlay — renders above all screens so toasts are visible
          regardless of which tab/screen is active. */}
      <Toast />
    </>
  );
}
