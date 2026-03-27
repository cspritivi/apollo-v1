import { Tabs } from "expo-router";
import Toast from "react-native-toast-message";
import { useCartStore } from "../../src/stores/cartStore";

/**
 * App Group Layout — tab-based navigation for authenticated screens.
 *
 * ARCHITECTURE: TABS + NESTED STACKS
 * Each tab that has push/pop flows gets its own Stack navigator (defined in
 * a _layout.tsx inside its route group folder). This gives each tab an
 * independent navigation stack with automatic back button behavior.
 *
 * - (home)/ → Stack: Home dashboard, Orders list, Order Detail, Saved Fabrics
 * - fabrics → plain tab screen (no sub-navigation)
 * - (products)/ → Stack: Products catalog, Configurator
 * - cart → plain tab screen (no sub-navigation)
 * - order-success → hidden screen (reached via router.replace after checkout)
 *
 * WHY NESTED STACKS (PREVIOUSLY FLAT TABS):
 * The previous flat approach used href: null to hide pushed screens (orders,
 * order-detail, configurator) inside the tab bar. This broke back navigation —
 * router.back() didn't maintain a proper stack, so Home → Orders → Order Detail
 * → Back would skip Orders and jump to Home. The workaround was a fragile `from`
 * search param on order-detail. Nested Stacks fix this entirely — each stack
 * manages its own history and back buttons work automatically.
 *
 * IMPORTANT: Tab screens that contain a nested Stack must set headerShown: false
 * to avoid double headers (one from Tabs, one from the nested Stack).
 *
 * INTERVIEW TALKING POINT:
 * "We migrated from flat tabs with hidden screens to tabs with nested stacks.
 * The flat approach broke back navigation and required manual workarounds.
 * Nested stacks give each tab its own navigation history — the standard pattern
 * used in production React Native apps like Airbnb and Instagram."
 */
export default function AppLayout() {
  // Cart badge — shows item count on the Cart tab when > 0
  const cartItemCount = useCartStore((s) => s.itemCount());

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: "#4f46e5",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
          headerTitleStyle: {
            fontWeight: "700",
          },
        }}
      >
        {/**
         * Tab order is defined by the order of <Tabs.Screen> declarations here,
         * NOT by the file names. This gives us explicit control over tab ordering.
         *
         * Tabs with nested Stacks ((home), (products)) set headerShown: false
         * because their Stack _layout.tsx provides the header. Without this,
         * you'd see two stacked headers.
         */}
        <Tabs.Screen
          name="(home)"
          options={{
            title: "Home",
            tabBarLabel: "Home",
            tabBarAccessibilityLabel: "Home",
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="fabrics"
          options={{
            title: "Fabrics",
            tabBarLabel: "Fabrics",
            tabBarAccessibilityLabel: "Fabrics",
          }}
        />
        <Tabs.Screen
          name="(products)"
          options={{
            title: "Products",
            tabBarLabel: "Products",
            tabBarAccessibilityLabel: "Products",
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: "Cart",
            tabBarLabel: "Cart",
            tabBarAccessibilityLabel: "Cart",
            tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined,
          }}
        />
        {/* Order success is reached via router.replace after checkout —
          hidden from the tab bar since it's a post-action screen, not
          a browseable section. */}
        <Tabs.Screen
          name="order-success"
          options={{
            title: "Order Placed",
            href: null,
          }}
        />
      </Tabs>
      {/* Toast overlay — renders above all screens so toasts are visible
        regardless of which tab/screen is active. */}
      <Toast />
    </>
  );
}
