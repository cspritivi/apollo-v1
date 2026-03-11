import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Fabric } from "../../../types";

/**
 * Props for the FabricCard component.
 *
 * WHY onPress IS A CALLBACK (NOT NAVIGATION):
 * The card doesn't navigate itself — it calls back to the parent screen
 * which decides what to do (open a modal, navigate to a detail screen, etc.).
 * This keeps the component reusable: the same card could be used in
 * the catalog grid, a search results list, or an order summary.
 */
interface FabricCardProps {
  fabric: Fabric;
  onPress: (fabric: Fabric) => void;
}

/**
 * FabricCard — displays a single fabric in the catalog grid.
 *
 * Shows the fabric image, name, price per meter, and color tags.
 * Designed for a 2-column FlatList grid layout.
 *
 * WHY IMAGE WITH A FALLBACK BACKGROUND:
 * Fabric images come from Supabase Storage. On slow connections the image
 * may take time to load — the grey background prevents a jarring flash of
 * white. We use React Native's built-in Image component rather than
 * expo-image to avoid an additional dependency for now.
 */
export default function FabricCard({ fabric, onPress }: FabricCardProps) {
  // Convert cents to dollars for display.
  // Stored in cents to avoid floating-point precision issues in calculations.
  const priceDisplay = `$${(fabric.price_per_meter / 100).toFixed(2)}/m`;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
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
        <Text style={styles.name} numberOfLines={2}>
          {fabric.name}
        </Text>

        <Text style={styles.price}>{priceDisplay}</Text>

        {/* Color tags shown as small pills below the price.
            WHY RENDER ALL TAGS (NOT JUST FIRST 2):
            Most fabrics have 1-3 color tags. Truncating would hide useful
            info (e.g., "herringbone" tag on a tweed). If a fabric ever has
            many tags, numberOfLines on the container would clip naturally. */}
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
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 2,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.85,
  },
  image: {
    width: "100%",
    aspectRatio: 1, // Square image for consistent grid appearance
    backgroundColor: "#f3f4f6", // Light grey placeholder while loading
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  price: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4f46e5", // Indigo — stands out as actionable/important info
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
