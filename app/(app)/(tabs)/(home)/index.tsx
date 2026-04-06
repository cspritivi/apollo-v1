import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import RecentlyViewedRow from "@/components/RecentlyViewedRow";
import { RecentlyViewedItem } from "@/stores/recentlyViewedStore";

/**
 * Home screen — curated storefront landing page.
 *
 * After #20, this screen is the first thing customers see after login.
 * It should inspire browsing and drive conversions, not manage accounts.
 * Account functionality (orders, saved fabrics, sign out) moved to the
 * Profile tab.
 *
 * Currently a stub with recently viewed items. Phase 2 adds: hero banner,
 * quick actions, featured fabrics, and trust signals.
 */

export default function HomeScreen() {
  const router = useRouter();

  // Navigate to the appropriate screen when a recently viewed item is tapped
  const handleRecentlyViewedPress = (item: RecentlyViewedItem) => {
    if (item.type === "product") {
      router.push({
        pathname: "/(products)/configurator",
        params: { productId: item.id },
      } as any);
    } else {
      // For fabrics, navigate to the fabrics tab
      router.navigate("/(app)/fabrics" as any);
    }
  };

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Recently Viewed — shows items the customer has browsed for easy
          re-discovery. Only renders if there are recently viewed items. */}
      <RecentlyViewedRow onItemPress={handleRecentlyViewedPress} />

      {/* Placeholder — storefront content coming in Phase 2 */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Welcome to Apollo Tailoring</Text>
        <Text style={styles.placeholderSubtext}>
          Browse our fabrics and products to get started.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  placeholder: {
    marginTop: 48,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  placeholderText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  placeholderSubtext: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
});
