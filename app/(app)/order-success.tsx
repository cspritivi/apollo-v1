/**
 * Order Success Screen — shown after successful order placement.
 *
 * Displayed for both express checkout (single item) and cart checkout
 * (multiple items). The screen is navigated to via router.replace() so
 * the back button doesn't return to the configurator or cart (which are
 * now in a cleared/empty state).
 *
 * WHY A DEDICATED SCREEN (not a modal or toast):
 * Order placement is the culmination of a multi-step flow. A full screen
 * provides space for a summary, next steps (visit the shop), and clear
 * navigation options. A toast would be too fleeting; a modal would feel
 * interruptive. This matches the pattern used by most e-commerce apps.
 */

import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function OrderSuccessScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Success indicator */}
        <View style={styles.checkmarkCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>

        <Text style={styles.heading}>Order Placed!</Text>

        {/* Status badge */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>PLACED</Text>
        </View>

        {/* Next steps — reminds customer about in-person measurements */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What's Next?</Text>
          <Text style={styles.infoText}>
            Visit the shop to get measured. We'll start production once your
            measurements are on file.
          </Text>
        </View>
      </View>

      {/* Navigation options */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/")}
          accessibilityRole="button"
          accessibilityLabel="View My Orders"
        >
          <Text style={styles.primaryButtonText}>View My Orders</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.replace("/products")}
          accessibilityRole="button"
          accessibilityLabel="Continue Shopping"
        >
          <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  checkmark: {
    fontSize: 40,
    color: "#fff",
    fontWeight: "700",
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 32,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3b82f6",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryButton: {
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
});
