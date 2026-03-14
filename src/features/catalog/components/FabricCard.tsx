import { useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  StyleSheet,
} from "react-native";
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
  /** Whether this fabric is saved/bookmarked by the current user */
  isSaved: boolean;
  /** Called when the save/unsave button is pressed */
  onToggleSave: (fabricId: string) => void;
}

/**
 * FabricCard — displays a single fabric in the catalog grid.
 *
 * Shows the fabric image, name, price per meter, and color tags.
 * Designed for a 2-column FlatList grid layout.
 *
 * The save button overlays the top-right corner of the image. It shows
 * a "+" when unsaved and a "✓" when saved, with a spring bounce animation
 * on toggle to provide tactile feedback.
 *
 * WHY IMAGE WITH A FALLBACK BACKGROUND:
 * Fabric images come from Supabase Storage. On slow connections the image
 * may take time to load — the grey background prevents a jarring flash of
 * white. We use React Native's built-in Image component rather than
 * expo-image to avoid an additional dependency for now.
 */
export default function FabricCard({
  fabric,
  onPress,
  isSaved,
  onToggleSave,
}: FabricCardProps) {
  // Convert cents to dollars for display.
  // Stored in cents to avoid floating-point precision issues in calculations.
  const priceDisplay = `$${(fabric.price_per_meter / 100).toFixed(2)}/m`;

  /**
   * ANIMATION WITH Animated.Value AND useRef:
   *
   * Animated.Value is React Native's way of driving animations without
   * triggering re-renders. The value lives outside the React render cycle —
   * it updates the native UI layer directly via the bridge, which is why
   * animations stay smooth even during heavy JS work.
   *
   * useRef persists the Animated.Value across re-renders without causing
   * new renders itself. If we used useState, changing the value would
   * trigger a re-render, which defeats the purpose of Animated.
   *
   * The scale starts at 1 (normal size). On toggle, it bounces to 1.3
   * then springs back to 1 — a subtle "pop" effect that confirms the
   * action without being distracting.
   */
  const scaleAnim = useRef(new Animated.Value(1)).current;

  /**
   * WHY useEffect WATCHING isSaved:
   * The animation triggers when isSaved changes (driven by the parent's
   * optimistic update), not when the button is pressed. This ensures the
   * animation plays in sync with the visual state change (+ → ✓ or ✓ → +).
   * Using useRef to track the initial render prevents the animation from
   * playing on mount — we only want it on user-initiated toggles.
   */
  const isInitialRender = useRef(true);

  useEffect(() => {
    // Skip animation on initial render — only animate on user-initiated toggles.
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    // Animated.spring creates a physics-based animation that feels natural.
    // WHY SPRING (NOT timing):
    // spring() simulates real-world physics — the icon overshoots slightly
    // then settles back, like a physical button. timing() is linear and
    // mechanical. Spring animations feel more alive and are the standard
    // for micro-interactions in mobile UI (iOS uses springs everywhere).
    Animated.spring(scaleAnim, {
      toValue: 1.3,
      useNativeDriver: true, // Runs animation on the native thread, not JS thread
      speed: 50, // How fast the spring moves
      bounciness: 12, // How much it overshoots and oscillates
    }).start(() => {
      // After the scale-up completes, spring back to normal size.
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 8,
      }).start();
    });
  }, [isSaved, scaleAnim]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(fabric)}
      accessibilityRole="button"
      accessibilityLabel={`${fabric.name}, ${priceDisplay}`}
    >
      {/* Image container with relative positioning so the save button
          can be absolutely positioned over the top-right corner. */}
      <View>
        <Image
          source={{ uri: fabric.image_url }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={`${fabric.name} fabric swatch`}
        />

        {/* Save/unsave button — overlays the image.
            WHY A SEPARATE Pressable (NOT PART OF THE CARD'S onPress):
            The card press opens the detail modal. The save button is a
            distinct action. Nesting a Pressable inside another Pressable
            works because React Native's gesture system stops event propagation
            when the inner Pressable handles the touch. */}
        <Pressable
          style={styles.saveButton}
          onPress={(e) => {
            // Stop the touch from bubbling up to the card's onPress.
            // Without this, tapping save would ALSO open the detail modal.
            e.stopPropagation();
            onToggleSave(fabric.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? "Unsave fabric" : "Save fabric"}
          hitSlop={8} // Extends the tappable area by 8px in all directions,
          // making the small button easier to hit on mobile.
        >
          <Animated.View
            style={[
              styles.saveIconContainer,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Text style={styles.saveIcon}>{isSaved ? "✓" : "+"}</Text>
          </Animated.View>
        </Pressable>
      </View>

      <View style={styles.info}>
        {/* testID uses the fabric id to create a unique, stable selector for
            Maestro E2E tests. This is necessary because the parent Pressable's
            accessibilityLabel groups all children into one atomic element on iOS,
            making individual <Text> nodes invisible to text-based matchers.
            testID bypasses that grouping — Maestro's id: selector can find it
            regardless of the accessibility tree structure. */}
        <Text
          style={styles.name}
          numberOfLines={2}
          testID={`fabric-name-${fabric.id}`}
        >
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
  saveButton: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  saveIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    // Subtle shadow to lift the button off the image
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  saveIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    // Slight upward offset for optical centering — the "+" glyph sits
    // slightly low in most fonts due to baseline alignment.
    marginTop: -1,
  },
});
