import { Stack } from "expo-router";
import CartHeaderIcon from "@/components/CartHeaderIcon";
import { stackHeaderOptions } from "@/lib/headerConfig";

/**
 * Home Stack Layout — nested Stack navigator inside the Home tab.
 *
 * After #20, the Home tab is the curated storefront. Account-related screens
 * (orders, order detail, saved fabrics, alterations) were moved to the
 * Profile tab's stack. This stack now only contains the storefront index.
 *
 * CART ICON:
 * Included in headerRight for consistency across all tabs.
 *
 * HEADER STYLING:
 * All visual options come from src/lib/headerConfig.ts (shared config).
 */

// Stable reference — avoids re-creating headerRight on every render
const CartHeaderRight = () => <CartHeaderIcon />;

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        ...stackHeaderOptions,
        headerRight: CartHeaderRight,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
    </Stack>
  );
}
