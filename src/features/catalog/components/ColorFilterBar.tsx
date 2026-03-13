import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";

/**
 * Props for the ColorFilterBar component.
 *
 * WHY colors IS A PROP (NOT FETCHED INTERNALLY):
 * The parent screen already has the fabric data from React Query. Deriving
 * the unique color list and passing it down avoids a redundant fetch and
 * keeps this component a pure presentational component — it only knows
 * about rendering pills, not about where the data comes from. This makes
 * it reusable (e.g., in a product filter bar later) and easy to test.
 */
interface ColorFilterBarProps {
  /** Unique color tags extracted from the fabric catalog */
  colors: string[];
  /** Currently active color filter, or null if no filter is active */
  selectedColor: string | null;
  /** Called when a color pill is pressed — receives the color name or null to clear */
  onSelectColor: (color: string | null) => void;
}

/**
 * ColorFilterBar — horizontally scrollable row of color filter pills.
 *
 * Pressing a pill activates that color filter and shows an "×" to indicate
 * it can be cleared. Pressing the same pill again (or the ×) clears the filter.
 * Only one color can be active at a time — this is a deliberate UX choice to
 * keep the interaction simple for customers.
 *
 * WHY ScrollView (NOT FlatList):
 * FlatList virtualizes rendering for large lists, but we have ~10-15 unique
 * color tags at most. ScrollView renders all items at once, which is fine
 * for this count and avoids FlatList's overhead (keyExtractor, renderItem,
 * layout measurement). Rule of thumb: use FlatList for 20+ items, ScrollView
 * for fewer.
 *
 * WHY horizontal + showsHorizontalScrollIndicator={false}:
 * Color pills should scroll naturally with a swipe gesture. The scroll
 * indicator would add visual clutter to what's essentially a row of buttons.
 * Users discover horizontal scrolling by seeing pills partially clipped at
 * the edge — a well-established mobile pattern (Instagram stories, Netflix).
 */
export default function ColorFilterBar({
  colors,
  selectedColor,
  onSelectColor,
}: ColorFilterBarProps) {
  // Don't render the bar at all if there are no colors to filter by.
  // This prevents an empty padded row from taking up vertical space.
  if (colors.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {colors.map((color) => {
          const isActive = selectedColor === color;

          return (
            <Pressable
              key={color}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() =>
                /**
                 * TOGGLE PATTERN:
                 * If the user taps the already-active color, clear the filter (set null).
                 * If they tap a different color, activate that one (replacing any previous).
                 * This is a single-select toggle — simpler than multi-select and avoids
                 * the need for a "Clear All" button or complex filter state management.
                 */
                onSelectColor(isActive ? null : color)
              }
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={
                isActive
                  ? `${color} filter active, tap to clear`
                  : `Filter by ${color}`
              }
            >
              <Text
                style={[styles.pillText, isActive && styles.pillTextActive]}
              >
                {color}
              </Text>

              {/* Show an × indicator on the active pill so users know they can
                  tap again to clear. This is a discoverability affordance — without
                  it, users might not realize the filter is toggleable. */}
              {isActive && <Text style={styles.clearIcon}>×</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f9fafb",
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    // Subtle border to define shape on the light background
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  pillActive: {
    // Indigo background matches the price color in FabricCard — creates
    // visual consistency in the "actionable/interactive" color language.
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    textTransform: "capitalize",
  },
  pillTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  clearIcon: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
    // Slight upward offset so the × looks visually centered next to text.
    // Text baselines and special characters don't always align optically.
    marginTop: -1,
  },
});
