import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { openWhatsAppSupport, SupportContext } from "@/lib/support";

/**
 * SupportFAB — floating action button for WhatsApp support.
 *
 * WHY A FAB (not a menu item or settings option):
 * Support should be instantly accessible when the customer is confused or
 * stuck — not buried in a menu. A FAB in the bottom-right corner is the
 * standard pattern for primary actions in mobile apps (Material Design).
 * Positioned with enough bottom padding to avoid overlapping tab bars or
 * navigation buttons.
 *
 * WHY CONTEXTUAL:
 * Each screen passes its own SupportContext so the pre-filled WhatsApp
 * message includes relevant details (order ID, product name). This saves
 * the customer from explaining their situation from scratch.
 */

interface SupportFABProps {
  context: SupportContext;
}

export default function SupportFAB({ context }: SupportFABProps) {
  // Don't render if no WhatsApp number is configured
  if (!process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP) return null;

  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      onPress={() => openWhatsAppSupport(context)}
      accessibilityRole="button"
      accessibilityLabel="Need help? Contact us on WhatsApp"
    >
      <Ionicons name="logo-whatsapp" size={26} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#25D366", // WhatsApp brand green
    justifyContent: "center",
    alignItems: "center",
    // Shadow for floating appearance
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
