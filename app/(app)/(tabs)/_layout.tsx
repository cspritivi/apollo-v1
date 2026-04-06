import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

/**
 * Tabs Layout — bottom tab navigation for the main app sections.
 *
 * HEADER STRATEGY:
 * Every tab sets headerShown: false and delegates header rendering to its
 * nested Stack navigator. This ensures all headers come from the same
 * native-stack component with identical appearance — no visual drift between
 * tabs. Header styling is centralized in src/lib/headerConfig.ts.
 *
 * CART ICON:
 * Each nested Stack includes headerRight: CartHeaderRight in its screenOptions.
 * The Tabs navigator never renders its own header, so it doesn't need headerRight.
 *
 * TAB LAYOUT (4 tabs):
 * Home (storefront) | Fabrics | Products | Profile (account)
 *
 * WHY 4 TABS:
 * Home was split from account management in #20. Home is now a curated
 * storefront (sells), Profile is the account dashboard (manages). Cart
 * lives as a header icon + Stack screen. This matches the standard e-commerce
 * pattern (Amazon, Nike, ASOS) where 4 tabs is the norm.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        // All tabs delegate headers to their nested Stacks
        headerShown: false,
        tabBarActiveTintColor: "#4f46e5",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      {/**
       * Tab order is defined by the order of <Tabs.Screen> declarations here,
       * NOT by the file names. This gives us explicit control over tab ordering.
       *
       * Every tab has a nested Stack that provides its own header with consistent
       * styling from stackHeaderOptions + CartHeaderRight.
       */}
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarAccessibilityLabel: "Home",
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
        name="(fabrics)"
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "shirt" : "shirt-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarAccessibilityLabel: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
