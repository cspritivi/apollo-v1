import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
} from "react-native";
import {
  RecentlyViewedItem,
  useRecentlyViewedStore,
} from "../stores/recentlyViewedStore";

/**
 * RecentlyViewedRow — horizontal scrollable row of recently viewed items.
 *
 * WHY A HORIZONTAL SCROLL (not a grid):
 * Recently viewed is a secondary discovery surface, not the primary browse.
 * A horizontal row takes minimal vertical space, letting the main content
 * (orders, catalog) dominate. This is the standard pattern in e-commerce
 * apps (Amazon, ASOS, Nike).
 *
 * WHY RENDER INLINE (not a modal/page):
 * Customers should see recently viewed items as a passive reminder during
 * normal browsing, not as a destination they have to navigate to. Inline
 * placement on Home and Fabrics screens maximizes re-engagement.
 */

interface RecentlyViewedRowProps {
  /** Called when a recently viewed item is tapped */
  onItemPress: (item: RecentlyViewedItem) => void;
  /** Optional filter to show only fabrics or only products */
  filterType?: "fabric" | "product";
}

export default function RecentlyViewedRow({
  onItemPress,
  filterType,
}: RecentlyViewedRowProps) {
  const items = useRecentlyViewedStore((s) => s.items);

  const filteredItems = filterType
    ? items.filter((item) => item.type === filterType)
    : items;

  // Don't render anything if there are no recently viewed items
  if (filteredItems.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recently Viewed</Text>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => onItemPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, recently viewed`}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={styles.placeholderText}>
                  {item.name.charAt(0)}
                </Text>
              </View>
            )}
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.price}>
              {item.type === "fabric"
                ? `$${(item.price / 100).toFixed(2)}/m`
                : `From $${(item.price / 100).toFixed(2)}`}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  card: {
    width: 130,
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.85,
  },
  image: {
    width: 130,
    height: 130,
    backgroundColor: "#f3f4f6",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#9ca3af",
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  price: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4f46e5",
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 2,
  },
});
