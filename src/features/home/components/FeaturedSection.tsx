import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";

/**
 * FeaturedSection — generic horizontal scroll container with a title
 * and optional "See All" link.
 *
 * Used on the Home storefront for different content types (featured fabrics,
 * new arrivals, etc.). The component handles layout and header; the caller
 * provides the scrollable children.
 *
 * WHY A GENERIC WRAPPER:
 * Multiple storefront sections share the same layout pattern (title row +
 * horizontal scroll). Extracting this into a reusable component prevents
 * duplicating the header/scroll structure for each section type.
 */

interface FeaturedSectionProps {
  title: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}

export default function FeaturedSection({
  title,
  onSeeAll,
  children,
}: FeaturedSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <Pressable onPress={onSeeAll}>
            <Text style={styles.seeAll}>See All</Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4f46e5",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
});
