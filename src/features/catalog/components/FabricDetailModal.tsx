import { useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";
import { Fabric } from "@/types";

/**
 * Props for the FabricDetailModal.
 *
 * WHY fabric IS Fabric | null (NOT ALWAYS Fabric):
 * The parent screen controls which fabric is selected. When no fabric
 * is selected (null), the modal is hidden. This avoids needing a
 * separate `visible` boolean prop — the fabric itself is the source
 * of truth for modal visibility. One state variable, not two.
 */
interface FabricDetailModalProps {
  fabric: Fabric | null;
  onClose: () => void;
  /** Whether this fabric is saved/bookmarked by the current user */
  isSaved: boolean;
  /** Called when the save/unsave button is pressed */
  onToggleSave: (fabricId: string) => void;
}

/**
 * FabricDetailModal — full-screen modal showing fabric details.
 *
 * Displays larger image, full description, price, availability, and color tags.
 * Uses React Native's built-in Modal component rather than a bottom sheet
 * library to avoid adding a dependency. Can upgrade to @gorhom/bottom-sheet
 * later if swipe-to-dismiss gestures are needed.
 *
 * WHY Modal INSTEAD OF NAVIGATING TO A NEW SCREEN:
 * A modal keeps the catalog grid visible underneath (on tablets especially),
 * and the user stays in context — dismissing returns to exactly where they
 * were scrolled in the list. A separate screen would reset scroll position
 * unless we implement scroll restoration.
 */
export default function FabricDetailModal({
  fabric,
  onClose,
  isSaved,
  onToggleSave,
}: FabricDetailModalProps) {
  /**
   * Same spring bounce animation as FabricCard — triggers when isSaved
   * changes. See FabricCard.tsx for a detailed explanation of why we use
   * Animated.spring, useRef, and the initial render guard.
   */
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    Animated.spring(scaleAnim, {
      toValue: 1.1, // Slightly smaller bounce than FabricCard — the label
      // is wider so a 1.3x scale would look exaggerated.
      useNativeDriver: true,
      speed: 50,
      bounciness: 12,
    }).start(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 8,
      }).start();
    });
  }, [isSaved, scaleAnim]);

  if (!fabric) return null;

  const priceDisplay = `$${(fabric.price_per_meter / 100).toFixed(2)} per meter`;

  return (
    <Modal
      visible={!!fabric}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header with close button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Fabric Details</Text>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close fabric details"
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image container with save button overlay — same top-right
              positioning as FabricCard for consistency across the app. */}
          <View>
            <Image
              source={{ uri: fabric.image_url }}
              style={styles.image}
              resizeMode="cover"
              accessibilityLabel={`${fabric.name} fabric detail image`}
            />
            <Pressable
              onPress={() => onToggleSave(fabric.id)}
              style={styles.saveButton}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? "Unsave fabric" : "Save fabric"}
            >
              <Animated.View
                style={[styles.savePill, { transform: [{ scale: scaleAnim }] }]}
              >
                <Text style={styles.saveLabel}>
                  {isSaved ? "Fabric Saved" : "Save Fabric"}
                </Text>
                <Text style={styles.saveIcon}>{isSaved ? "✓" : "+"}</Text>
              </Animated.View>
            </Pressable>
          </View>

          {/* Fabric name and availability badge */}
          <View style={styles.titleRow}>
            <Text style={styles.name}>{fabric.name}</Text>
            <View
              style={[
                styles.badge,
                fabric.available
                  ? styles.badgeAvailable
                  : styles.badgeUnavailable,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  fabric.available
                    ? styles.badgeTextAvailable
                    : styles.badgeTextUnavailable,
                ]}
              >
                {fabric.available ? "In Stock" : "Out of Stock"}
              </Text>
            </View>
          </View>

          {/* Price */}
          <Text style={styles.price}>{priceDisplay}</Text>

          {/* Description — only rendered if the fabric has one */}
          {fabric.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{fabric.description}</Text>
            </View>
          )}

          {/* Color tags */}
          {fabric.color_tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Colors</Text>
              <View style={styles.tagsRow}>
                {fabric.color_tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  image: {
    width: "100%",
    aspectRatio: 4 / 3, // Wider aspect ratio than card for better detail view
    backgroundColor: "#f3f4f6",
  },
  saveButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  savePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  saveLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  saveIcon: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    flex: 1, // Allows name to shrink if badge takes space
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeAvailable: {
    backgroundColor: "#ecfdf5",
  },
  badgeUnavailable: {
    backgroundColor: "#fef2f2",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  badgeTextAvailable: {
    color: "#059669",
  },
  badgeTextUnavailable: {
    color: "#dc2626",
  },
  price: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4f46e5",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: "#374151",
    textTransform: "capitalize",
  },
});
