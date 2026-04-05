import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Fabric } from "@/types";

/**
 * Props for the SavedFabricCard component.
 *
 * WHY A SEPARATE COMPONENT (NOT REUSING FabricCard WITH A layout PROP):
 * FabricCard is designed for a 2-column grid — square image, vertical layout,
 * compact info. The saved fabrics screen uses a fundamentally different layout:
 * horizontal, one-per-row, with the full description visible. Trying to make
 * one component handle both layouts would add conditional rendering complexity
 * for minimal code reuse. Two focused components are clearer than one
 * overloaded one. This follows the Single Responsibility Principle.
 */
interface SavedFabricCardProps {
  fabric: Fabric;
  onPress: (fabric: Fabric) => void;
  /** Whether the list is in edit mode (shows delete buttons) */
  isEditing: boolean;
  /** Called when the red delete button is pressed in edit mode */
  onDelete: (fabricId: string) => void;
}

/**
 * SavedFabricCard — horizontal layout for the saved fabrics screen.
 *
 * Shows the fabric image on the left with name, description, and price
 * on the right. One card per row.
 *
 * In edit mode, a red "−" button appears on the left side of the card
 * (iOS-style delete pattern — familiar from Mail, Reminders, etc.).
 * This is deliberately separate from the catalog's +/✓ toggle because
 * saved fabrics are ALL saved by definition — showing a ✓ on every card
 * is redundant information. The edit mode pattern gives the user a
 * clear, intentional flow for removing items.
 */
export default function SavedFabricCard({
  fabric,
  onPress,
  isEditing,
  onDelete,
}: SavedFabricCardProps) {
  const priceDisplay = `$${(fabric.price_per_meter / 100).toFixed(2)}/m`;

  return (
    <View style={styles.row}>
      {/* Red delete button — only visible in edit mode.
          Positioned to the left of the card, outside its bounds, so the
          card layout doesn't shift when entering/exiting edit mode.
          This mirrors the iOS list editing pattern (Mail, Reminders). */}
      {isEditing && (
        <Pressable
          style={styles.deleteButton}
          onPress={() => onDelete(fabric.id)}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${fabric.name} from saved`}
        >
          <View style={styles.deleteIconContainer}>
            <Text style={styles.deleteIcon}>−</Text>
          </View>
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
          isEditing && styles.cardEditing,
        ]}
        onPress={() => onPress(fabric)}
        accessibilityRole="button"
        accessibilityLabel={`${fabric.name}, ${priceDisplay}`}
      >
        <Image
          source={{ uri: fabric.image_url }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={`${fabric.name} fabric swatch`}
        />

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {fabric.name}
          </Text>

          {fabric.description && (
            <Text style={styles.description} numberOfLines={2}>
              {fabric.description}
            </Text>
          )}

          <Text style={styles.price}>{priceDisplay}</Text>

          {fabric.color_tags.length > 0 && (
            <View style={styles.tagsRow}>
              {fabric.color_tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginVertical: 6,
  },
  deleteButton: {
    marginRight: 8,
  },
  deleteIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: -2, // Optical centering for the minus glyph
  },
  card: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardEditing: {
    // Subtle visual cue that the list is in edit mode
    opacity: 0.95,
  },
  image: {
    width: 110,
    height: 110,
    backgroundColor: "#f3f4f6",
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
    marginBottom: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4f46e5",
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  tag: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    color: "#6b7280",
    textTransform: "capitalize",
  },
});
