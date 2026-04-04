import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import CartHeaderIcon from "../../../src/components/CartHeaderIcon";

/**
 * Tabs Layout — bottom tab navigation for the main app sections.
 *
 * SINGLE SOURCE OF TRUTH FOR CART ICON:
 * The cart icon is injected via screenOptions.headerRight here. This applies
 * directly to any tab where headerShown is true (Fabrics). Tabs with nested
 * Stacks (Home, Products) set headerShown: false and must carry the icon
 * forward in their own Stack screenOptions — see (home)/_layout.tsx and
 * (products)/_layout.tsx.
 *
 * WHY 3 TABS (not 4):
 * Cart was moved from a tab to a header icon + Stack screen (see parent
 * _layout.tsx). This frees up a tab slot and makes the cart accessible
 * from every screen via the persistent header icon — matching the standard
 * e-commerce pattern (Amazon, Nike, ASOS).
 */

// Stable reference — avoids re-creating headerRight on every render
const CartHeaderRight = () => <CartHeaderIcon />;

export default function TabsLayout() {
  return (
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
        // Cart icon in header — visible on all tab screens with headers
        headerRight: CartHeaderRight,
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="fabrics"
        options={{
          title: "Fabrics",
          tabBarLabel: "Fabrics",
          tabBarAccessibilityLabel: "Fabrics",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "color-palette" : "color-palette-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(products)"
        options={{
          title: "Products",
          tabBarLabel: "Products",
          tabBarAccessibilityLabel: "Products",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "shirt" : "shirt-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
