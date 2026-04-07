import { Stack } from "expo-router";
import CartHeaderIcon from "@/components/CartHeaderIcon";
import { stackHeaderOptions } from "@/lib/headerConfig";

/**
 * Profile Stack Layout — nested Stack navigator inside the Profile tab.
 *
 * Houses all account-related screens: profile dashboard, orders, order
 * detail, saved fabrics, and alteration flows. These were moved here
 * from the Home stack as part of #20 (Home → storefront, Profile → account).
 *
 * WHY A SEPARATE STACK:
 * Each tab needs its own Stack so navigation state is isolated. Pushing
 * Order Detail in the Profile tab doesn't affect Home, Fabrics, or Products.
 * Back buttons work automatically via React Navigation's stack behavior.
 *
 * HEADER STYLING:
 * All visual options come from src/lib/headerConfig.ts (shared config).
 * CartHeaderIcon is included in headerRight for consistency across all tabs.
 */

// Stable reference — avoids re-creating headerRight on every render
const CartHeaderRight = () => <CartHeaderIcon />;

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        ...stackHeaderOptions,
        headerRight: CartHeaderRight,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Profile" }} />
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
