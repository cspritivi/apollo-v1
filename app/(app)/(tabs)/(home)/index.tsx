import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import AppImage from "@/components/AppImage";
import { useRouter } from "expo-router";
import RecentlyViewedRow from "@/components/RecentlyViewedRow";
import { RecentlyViewedItem } from "@/stores/recentlyViewedStore";
import FitGuaranteeBadge from "@/components/FitGuaranteeBadge";
import HeroBanner from "@/features/home/components/HeroBanner";
import QuickActions from "@/features/home/components/QuickActions";
import FeaturedSection from "@/features/home/components/FeaturedSection";
import { useFabrics } from "@/features/catalog/hooks";
import { useSession } from "@/hooks/useSession";
import { Fabric } from "@/types";

/**
 * Home screen — curated storefront landing page.
 *
 * After #20, this screen is the first thing customers see after login.
 * It should inspire browsing and drive conversions, not manage accounts.
 * Account functionality (orders, saved fabrics, sign out) moved to the
 * Profile tab.
 *
 * LAYOUT (scroll order):
 * 1. HeroBanner — promotional headline with styled background
 * 2. QuickActions — CTA buttons for Products and Fabrics
 * 3. Featured Fabrics — horizontal scroll of available fabrics
 * 4. Recently Viewed — items the customer has browsed (if any)
 * 5. Fit Guarantee — trust signal badge
 *
 * WHY HARDCODED CONTENT:
 * The hero banner and sections use static content initially. When a CMS
 * or Supabase-driven content model is added, the data source changes but
 * the component structure stays the same.
 */

/** Max fabrics to show in the featured section */
const FEATURED_FABRIC_LIMIT = 8;

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();

  // Fetch available fabrics for the featured section — same query used by
  // the Fabrics tab, so React Query deduplicates and caches automatically
  const { data: fabrics } = useFabrics({
    availableOnly: true,
    enabled: !!session,
  });
  const featuredFabrics = fabrics?.slice(0, FEATURED_FABRIC_LIMIT) ?? [];

  const handleRecentlyViewedPress = (item: RecentlyViewedItem) => {
    if (item.type === "product") {
      router.push({
        pathname: "/(products)/configurator",
        params: { productId: item.id },
      } as never);
    } else {
      router.navigate("/(fabrics)" as never);
    }
  };

  // Format price from cents to display string
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}/m`;

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Hero Banner — tappable promotional area */}
      <HeroBanner
        headline="Crafted for You"
        subtext="Bespoke suits, shirts, and trousers tailored to perfection"
        onPress={() => router.navigate("/(products)" as never)}
      />

      {/* Quick Actions — primary CTAs */}
      <QuickActions />

      {/* Featured Fabrics — horizontal scroll of available fabrics */}
      {featuredFabrics.length > 0 && (
        <FeaturedSection
          title="Featured Fabrics"
          onSeeAll={() => router.navigate("/(fabrics)" as never)}
        >
          {featuredFabrics.map((fabric: Fabric) => (
            <Pressable
              key={fabric.id}
              style={styles.fabricCard}
              onPress={() => router.navigate("/(fabrics)" as never)}
            >
              <AppImage
                source={fabric.image_url}
                style={styles.fabricImage}
                fallbackText={fabric.name[0]}
                fallbackStyle={styles.fabricPlaceholder}
                fallbackTextStyle={styles.fabricPlaceholderText}
              />
              <Text style={styles.fabricName} numberOfLines={1}>
                {fabric.name}
              </Text>
              <Text style={styles.fabricPrice}>
                {formatPrice(fabric.price_per_meter)}
              </Text>
            </Pressable>
          ))}
        </FeaturedSection>
      )}

      {/* Recently Viewed — only renders if there are recently viewed items */}
      <RecentlyViewedRow onItemPress={handleRecentlyViewedPress} />

      {/* Trust Signal — fit guarantee badge */}
      <View style={styles.trustSection}>
        <FitGuaranteeBadge variant="full" />
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

  // Fabric cards in the featured section
  fabricCard: {
    width: 130,
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fabricImage: {
    width: 130,
    height: 130,
    backgroundColor: "#f3f4f6",
  },
  fabricPlaceholder: {
    width: 130,
    height: 130,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  fabricPlaceholderText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#9ca3af",
  },
  fabricName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  fabricPrice: {
    fontSize: 12,
    color: "#6b7280",
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 2,
  },

  // Trust signal section
  trustSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
});
