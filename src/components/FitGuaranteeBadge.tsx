import { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * FitGuaranteeBadge — trust signal for custom tailoring purchase confidence.
 *
 * WHY THIS EXISTS:
 * Custom clothing is high-commitment ($200-800+). Customers can't try before
 * buying, so a visible fit guarantee reduces purchase anxiety and improves
 * conversion. Indochino and Black Lapel feature this prominently.
 *
 * TWO VARIANTS:
 * - "compact": Icon + short text. Used on product cards and space-constrained
 *   areas. Tappable to show full policy.
 * - "full": Banner with headline + description. Used on configurator review
 *   and cart screens where there's more room and the trust signal has higher
 *   impact (closer to the purchase decision).
 *
 * INTERVIEW TALKING POINT:
 * "Trust signals placed near high-friction actions (checkout, configure) have
 * measurably higher impact on conversion than those placed on browse screens.
 * We use two variants to balance visibility with screen real estate."
 */

interface FitGuaranteeBadgeProps {
  variant?: "compact" | "full";
}

export default function FitGuaranteeBadge({
  variant = "compact",
}: FitGuaranteeBadgeProps) {
  const [showPolicy, setShowPolicy] = useState(false);

  if (variant === "full") {
    return (
      <>
        <Pressable
          style={styles.fullContainer}
          onPress={() => setShowPolicy(true)}
          accessibilityRole="button"
          accessibilityLabel="Perfect Fit Guaranteed — tap for details"
        >
          <View style={styles.fullHeader}>
            <Ionicons name="shield-checkmark" size={22} color="#059669" />
            <Text style={styles.fullTitle}>Perfect Fit Guaranteed</Text>
          </View>
          <Text style={styles.fullDescription}>
            Not sure about fit? We guarantee it. Free alterations if it&apos;s
            not perfect.
          </Text>
        </Pressable>
        <PolicyModal
          visible={showPolicy}
          onClose={() => setShowPolicy(false)}
        />
      </>
    );
  }

  // Compact variant — icon + short text inline
  return (
    <>
      <Pressable
        style={styles.compactContainer}
        onPress={() => setShowPolicy(true)}
        accessibilityRole="button"
        accessibilityLabel="Perfect Fit Guaranteed — tap for details"
      >
        <Ionicons name="shield-checkmark" size={14} color="#059669" />
        <Text style={styles.compactText}>Perfect Fit Guaranteed</Text>
      </Pressable>
      <PolicyModal visible={showPolicy} onClose={() => setShowPolicy(false)} />
    </>
  );
}

/**
 * PolicyModal — full guarantee policy details shown on tap.
 *
 * Keeps the badge itself lightweight while still making the full policy
 * accessible. The modal pattern avoids navigating away from the current
 * screen, which is important during checkout/configurator flows.
 */
function PolicyModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Our Fit Guarantee</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close guarantee details"
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color="#6b7280" />
          </Pressable>
        </View>

        <View style={styles.modalBody}>
          <View style={styles.modalIconRow}>
            <Ionicons name="shield-checkmark" size={40} color="#059669" />
          </View>

          <Text style={styles.modalHeadline}>
            Your perfect fit, guaranteed.
          </Text>

          <Text style={styles.modalParagraph}>
            Every garment we create is made to your exact measurements. If
            something doesn&apos;t fit right, we&apos;ll alter it for free until
            you&apos;re completely satisfied.
          </Text>

          <View style={styles.bulletList}>
            <BulletPoint text="Free alterations on your first fitting" />
            <BulletPoint text="Adjustments completed within 5-7 business days" />
            <BulletPoint text="Applies to all custom orders" />
            <BulletPoint text="No questions asked" />
          </View>

          <Text style={styles.modalFootnote}>
            Guarantee covers fit adjustments within 30 days of delivery. Does
            not cover damage, stains, or style change requests.
          </Text>
        </View>

        <Pressable style={styles.modalCloseButton} onPress={onClose}>
          <Text style={styles.modalCloseButtonText}>Got It</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name="checkmark-circle" size={18} color="#059669" />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Compact variant ---
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  compactText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },

  // --- Full variant ---
  fullContainer: {
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  fullHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  fullTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#065f46",
  },
  fullDescription: {
    fontSize: 13,
    color: "#047857",
    lineHeight: 18,
  },

  // --- Policy modal ---
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalBody: {
    padding: 24,
  },
  modalIconRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalHeadline: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 16,
  },
  modalParagraph: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 20,
  },
  bulletList: {
    gap: 12,
    marginBottom: 20,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bulletText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  modalFootnote: {
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 18,
  },
  modalCloseButton: {
    marginHorizontal: 24,
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
