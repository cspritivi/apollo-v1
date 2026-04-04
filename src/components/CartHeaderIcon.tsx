import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useCartStore } from "../stores/cartStore";

/**
 * CartHeaderIcon — persistent cart icon with badge for the header.
 *
 * WHY THIS IS A SHARED COMPONENT (not inline in each layout):
 * The cart icon appears on every screen via headerRight. A shared component
 * ensures visual consistency (icon size, badge style, color) across all
 * navigators and centralizes the navigation + re-entry guard logic.
 *
 * PERFORMANCE:
 * Subscribes to s.items.length (a primitive number) rather than the full
 * cart state. Zustand's shallow equality check means this component only
 * re-renders when the count actually changes — not on every store update.
 *
 * NAVIGATION:
 * Uses router.navigate() (not push) to prevent duplicate cart screens
 * in the stack. If the user taps the icon twice, navigate() returns to
 * the existing cart screen instead of pushing a second one.
 *
 * EDGE RE-ENTRY GUARD:
 * Even though navigate() is idempotent, we also check usePathname() and
 * skip the call entirely when already on /cart. This prevents any
 * navigation event or visual jitter.
 *
 * INTERVIEW TALKING POINT:
 * "The CartHeaderIcon demonstrates three patterns: Zustand selector
 * optimization (subscribing to a derived primitive), navigation
 * idempotency via navigate() instead of push(), and a pathname-based
 * guard to prevent re-entry. The badge caps at 99+ to maintain layout
 * stability using minWidth — a common mobile pattern from apps like
 * Amazon and Shopify."
 */
export default function CartHeaderIcon() {
  const router = useRouter();
  const pathname = usePathname();

  // Select only items.length — a stable primitive for efficient re-renders
  const itemCount = useCartStore((s) => s.items.length);

  // Format badge text: exact count for 1-99, "99+" for overflow
  const badgeText = itemCount > 99 ? "99+" : String(itemCount);

  // Accessibility label includes count for screen readers
  const accessibilityLabel =
    itemCount > 0 ? `Cart, ${itemCount} items` : "Cart, empty";

  const handlePress = () => {
    // Edge re-entry guard — skip navigation when already on cart screen
    if (pathname === "/cart") return;
    router.navigate("/cart");
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.container}
      hitSlop={8}
    >
      <Ionicons name="cart-outline" size={24} color="#4f46e5" />

      {/* Badge — only rendered when cart has items */}
      {itemCount > 0 && (
        <View testID="cart-badge" style={styles.badge}>
          <Text testID="cart-badge-text" style={styles.badgeText}>
            {badgeText}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    // Ensure consistent hit target and positioning context for badge
    marginRight: 8,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    // minWidth ensures layout stability across count changes (1 → 12 → 99+)
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    // Prevent text from pushing badge wider than necessary
    textAlign: "center",
  },
});
