import { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useProducts } from "../../../src/features/catalog/hooks";
import ProductCard from "../../../src/features/catalog/components/ProductCard";
import { Product } from "../../../src/types";
import { useRecentlyViewedStore } from "../../../src/stores/recentlyViewedStore";

/**
 * Products catalog screen — browsable grid of available product types.
 *
 * ARCHITECTURE:
 * Same 3-layer pattern as the fabrics screen: Screen → Hook → API.
 * - useProducts hook handles caching, loading, and error states
 * - ProductCard renders each item in the grid
 * - Tapping a card navigates to the configurator for that product
 *
 * WHY A SEPARATE SCREEN (NOT MERGED WITH FABRICS):
 * Products and fabrics serve different purposes in the customer journey.
 * Fabrics are raw materials to browse and bookmark. Products are the items
 * you're actually ordering (suit, shirt, trousers). Mixing them in one
 * screen would confuse the mental model — customers think "I want a suit"
 * first, then "what fabric should it be made from?"
 */
export default function ProductsScreen() {
  const router = useRouter();
  const {
    data: products,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useProducts();

  /**
   * Navigate to the configurator with the selected product.
   *
   * WHY router.push WITH PARAMS (NOT Zustand):
   * The product ID is the only data needed to start the configurator.
   * Passing it as a route param is simpler and more explicit than setting
   * Zustand state then navigating. The configurator screen reads the param
   * and fetches the full product data via useProduct(id). Zustand is used
   * later for tracking selections *within* the configurator steps.
   */
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addItem);

  const handleProductPress = useCallback(
    (product: Product) => {
      // Record this product as recently viewed
      addRecentlyViewed({
        id: product.id,
        type: "product",
        name: product.name,
        imageUrl: product.image_url,
        price: product.base_price,
      });
      router.push({
        pathname: "/configurator",
        params: { productId: product.id },
      });
    },
    [router, addRecentlyViewed],
  );

  // --- Loading state ---
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }

  // --- Empty state ---
  if (!products || products.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No products available</Text>
        <Text style={styles.emptyMessage}>
          Check back soon — new products are added regularly.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 2-column grid — same layout as the fabrics screen for visual
          consistency. With only 3 products this is a short list, but the
          grid pattern scales well if more products are added later. */}
      <FlatList
        data={products.length % 2 !== 0 ? [...products, null] : products}
        keyExtractor={(item, index) => item?.id ?? `spacer-${index}`}
        numColumns={2}
        renderItem={({ item }) =>
          item ? (
            <ProductCard product={item} onPress={handleProductPress} />
          ) : (
            // Invisible spacer for odd-count grids — prevents the last
            // card from stretching full-width. Same pattern as fabrics.
            <View style={{ flex: 1, margin: 6 }} />
          )
        }
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  listContent: {
    padding: 10,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6b7280",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#dc2626",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
