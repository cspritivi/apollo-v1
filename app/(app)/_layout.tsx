import { Tabs } from "expo-router";
import Toast from "react-native-toast-message";
import { useCartStore } from "../../src/stores/cartStore";

/**
 * App Group Layout — tab-based navigation for authenticated screens.
 *
 * WHY TABS NOW (PREVIOUSLY STACK):
 * With two top-level sections (Home and Fabrics), a tab navigator provides
 * the expected mobile UX — users can switch between sections with a single
 * tap and each tab preserves its own navigation state. This is the standard
 * pattern used by every major e-commerce and catalog app (Etsy, ASOS, etc.).
 *
 * WHY expo-router Tabs (NOT @react-navigation/bottom-tabs DIRECTLY):
 * Expo Router's <Tabs> wraps @react-navigation/bottom-tabs but integrates
 * with file-based routing. Each file in app/(app)/ automatically becomes
 * a tab screen. No manual route registration needed — adding a new tab is
 * just creating a new file.
 *
 * INTERVIEW TALKING POINT:
 * Switching from Stack to Tabs was a one-file change (this layout file only).
 * The screen files (index.tsx, fabrics.tsx) didn't change at all. This is the
 * power of separating navigation structure (layouts) from screen content —
 * you can restructure navigation without touching business logic.
 */
export default function AppLayout() {
  // Cart badge — shows item count on the Cart tab when > 0
  const cartItemCount = useCartStore((s) => s.itemCount());

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: "#4f46e5", // Indigo — matches price accent color
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
         * NOT by the file names. This gives us explicit control over tab ordering
         * even though the screens are file-based.
         */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarLabel: "Home",
            // WHY tabBarAccessibilityLabel:
            // React Navigation builds a compound accessibility label for tab buttons
            // (e.g., "Home, tab, 1 of 2"). Maestro's text matcher can't find "Home"
            // inside that string. Setting an explicit accessibilityLabel overrides
            // the compound one, making the tab reliably tappable in E2E tests.
            tabBarAccessibilityLabel: "Home",
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
          name="products"
          options={{
            title: "Products",
            tabBarLabel: "Products",
            tabBarAccessibilityLabel: "Products",
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: "Cart",
            tabBarLabel: "Cart",
            tabBarAccessibilityLabel: "Cart",
            // Badge creates purchase urgency for items sitting in the cart
            tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined,
          }}
        />
        {/* Saved fabrics is navigated to from the Home screen, not a tab.
          Setting href: null hides it from the tab bar while keeping it
          inside the (app) route group for auth protection. This is Expo
          Router's way of having "non-tab" screens within a Tabs layout —
          the screen exists in the navigation stack but doesn't get a tab. */}
        <Tabs.Screen
          name="saved-fabrics"
          options={{
            title: "Saved Fabrics",
            href: null,
          }}
        />
        {/* Configurator is a full-screen flow pushed from the products tab,
          not a tab itself. href: null hides it from the tab bar. The user
          enters via router.push("/configurator") with a productId param. */}
        <Tabs.Screen
          name="configurator"
          options={{
            title: "Configure",
            href: null,
          }}
        />
        {/* Order success shown after checkout — hidden from tab bar */}
        <Tabs.Screen
          name="order-success"
          options={{
            title: "Order Placed",
            href: null,
          }}
        />
        {/* Full orders list accessed from Home → "View All Orders" */}
        <Tabs.Screen
          name="orders"
          options={{
            title: "My Orders",
            href: null,
          }}
        />
      </Tabs>
      {/* Toast overlay — renders above all screens so toasts are visible
        regardless of which tab/screen is active. Placed outside <Tabs>
        so it isn't clipped by tab content boundaries. */}
      <Toast />
    </>
  );
}
