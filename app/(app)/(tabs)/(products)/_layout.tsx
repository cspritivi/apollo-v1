import { Stack } from "expo-router";
import CartHeaderIcon from "../../../../src/components/CartHeaderIcon";
import { stackHeaderOptions } from "../../../../src/lib/headerConfig";

/**
 * Products Stack Layout — nested Stack navigator inside the Products tab.
 *
 * SCREENS IN THIS STACK:
 * - index: Products catalog grid (initial screen)
 * - configurator: Multi-step product configuration wizard (pushed from catalog)
 *
 * WHY CONFIGURATOR IS IN THIS STACK:
 * The configurator is always entered from the products catalog (tap a product
 * card → push configurator). Placing it in the same Stack means the back button
 * automatically returns to the catalog. Previously it was a hidden tab screen
 * (href: null) which didn't have proper back navigation.
 *
 * CART ICON:
 * This Stack sets headerShown: false at the tab level, so it must explicitly
 * include headerRight to carry the cart icon forward. The Tabs layout is the
 * canonical source of truth — this inclusion is required only because we
 * override the header configuration.
 *
 * HEADER STYLING:
 * All visual options come from src/lib/headerConfig.ts (shared config).
 */

// Stable reference — avoids re-creating headerRight on every render
const CartHeaderRight = () => <CartHeaderIcon />;

export default function ProductsLayout() {
  return (
    <Stack
      screenOptions={{
        ...stackHeaderOptions,
        // Cart icon — inherited from Tabs intent, required because this Stack
        // provides its own header (tab-level headerShown: false)
        headerRight: CartHeaderRight,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Products" }} />
      <Stack.Screen name="configurator" options={{ title: "Configure" }} />
    </Stack>
  );
}
