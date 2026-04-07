import { View, Text, Pressable, StyleSheet } from "react-native";
import { ProductOption } from "@/types";
import AppImage from "@/components/AppImage";

/**
 * OptionCard — displays a single configurable option within an option group.
 *
 * Shows a large image (the visual reference is critical — customers can't
 * evaluate a "Notch Lapel" vs "Peak Lapel" from text alone), the option
 * name, description, and any price modifier.
 *
 * WHY LARGE IMAGES (NOT THUMBNAILS):
 * The whole point of the configurator is helping customers make visual
 * choices. A tiny 40x40 thumbnail of a lapel style is useless. Each option
 * card shows a large, clear image so customers can see the detail — the
 * stitching, the shape, the texture. This mirrors how physical tailors
 * show fabric swatches and style books to clients.
 *
 * WHY A SEPARATE COMPONENT (NOT INLINE IN OptionStep):
 * Keeps rendering logic for a single option isolated and testable.
 * OptionStep handles layout (grid/list) and selection state.
 * OptionCard handles visual presentation of one option.
 */

interface OptionCardProps {
  option: ProductOption;
  isSelected: boolean;
  onSelect: (option: ProductOption) => void;
  testID?: string;
}

export default function OptionCard({
  option,
  isSelected,
  onSelect,
  testID,
}: OptionCardProps) {
  // Format price modifier for display.
  // Positive values show as "+$20.00", negative as "-$20.00", zero shows nothing.
  const priceDisplay =
    option.price_modifier !== 0
      ? `${option.price_modifier > 0 ? "+" : "-"}$${(Math.abs(option.price_modifier) / 100).toFixed(2)}`
      : null;

  return (
    <Pressable
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={() => onSelect(option)}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${option.name}${priceDisplay ? `, ${priceDisplay}` : ""}${isSelected ? ", selected" : ""}`}
      testID={testID}
    >
      {/* Option image — the most important part of the card.
          AppImage shows a blurhash placeholder during load. If no image URL
          exists (shouldn't happen in production but possible during development),
          the letter fallback renders instead. */}
      <AppImage
        source={option.image_url}
        style={styles.image}
        accessibilityLabel={`${option.name} option preview`}
        fallbackText={option.name.charAt(0).toUpperCase()}
        fallbackStyle={styles.imageFallback}
        fallbackTextStyle={styles.imageFallbackText}
      />

      {/* Selection indicator — checkmark badge on selected option */}
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>✓</Text>
        </View>
      )}

      {/* Option info below the image */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {option.name}
        </Text>

        {option.description && (
          <Text style={styles.description} numberOfLines={2}>
            {option.description}
          </Text>
        )}

        {priceDisplay && <Text style={styles.price}>{priceDisplay}</Text>}
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
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  cardSelected: {
    // Indigo border highlights the selected option — a clear, accessible
    // visual indicator that doesn't rely on color alone (the checkmark badge
    // provides a secondary cue for colorblind users).
    borderColor: "#4f46e5",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f3f4f6",
  },
  imageFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  imageFallbackText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#9ca3af",
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
    // Shadow to lift badge off the image
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  selectedBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
    marginBottom: 4,
  },
  price: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4f46e5",
  },
});
