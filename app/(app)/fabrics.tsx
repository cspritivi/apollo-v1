import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useFabrics } from "../../src/features/catalog/hooks";
import FabricCard from "../../src/features/catalog/components/FabricCard";
import FabricDetailModal from "../../src/features/catalog/components/FabricDetailModal";
import { Fabric } from "../../src/types";

/**
 * Fabrics catalog screen — browsable grid of available fabrics.
 *
 * ARCHITECTURE:
 * This screen composes the 3-layer pattern: Screen → Hook → API.
 * - useFabrics hook handles caching, loading, and error states via React Query
 * - FabricCard renders each item in the grid
 * - FabricDetailModal shows full details when a card is tapped
 *
 * WHY FlatList (NOT ScrollView WITH .map()):
 * FlatList virtualizes the list — it only renders items currently visible on
 * screen plus a small buffer. With 20+ fabrics (and potentially hundreds as
 * the catalog grows), a ScrollView would mount all items at once, causing
 * slow initial render and high memory usage on lower-end devices.
 *
 * WHY availableOnly: true:
 * Customers should only see fabrics that are currently in stock. The tailor
 * manages availability via the Supabase dashboard. Out-of-stock fabrics are
 * soft-deleted (available = false), not removed, so they remain in existing orders.
 */
export default function FabricsScreen() {
  const {
    data: fabrics,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useFabrics({
    availableOnly: true,
  });

  // Selected fabric controls modal visibility (null = modal hidden).
  // Single state variable instead of separate `selectedFabric` + `isModalOpen`.
  const [selectedFabric, setSelectedFabric] = useState<Fabric | null>(null);

  /**
   * WHY useCallback:
   * This function is passed as a prop to each FabricCard. Without useCallback,
   * a new function reference is created on every render, causing every card to
   * re-render even if the data hasn't changed. useCallback memoizes the reference.
   */
  const handleFabricPress = useCallback((fabric: Fabric) => {
    setSelectedFabric(fabric);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedFabric(null);
  }, []);

  // --- Loading state ---
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading fabrics...</Text>
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

  // --- Empty state (all fabrics unavailable or none seeded) ---
  if (!fabrics || fabrics.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No fabrics available</Text>
        <Text style={styles.emptyMessage}>
          Check back soon — new fabrics are added regularly.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/**
       * WHY numColumns={2}:
       * A 2-column grid is the standard pattern for product catalogs on mobile
       * (Instagram shop, Etsy, etc.). It shows enough detail per item while
       * letting users browse quickly. Three columns would make images too small
       * for fabric texture to be visible.
       */}
      {/* WHY PAD WITH NULL:
          FlatList with numColumns={2} and flex:1 cards causes the last item
          to stretch full-width when the count is odd. Appending a null entry
          lets us render an invisible spacer that occupies the empty cell,
          keeping all real cards the same size. */}
      <FlatList
        data={fabrics.length % 2 !== 0 ? [...fabrics, null] : fabrics}
        keyExtractor={(item, index) => item?.id ?? `spacer-${index}`}
        numColumns={2}
        renderItem={({ item }) =>
          item ? (
            <FabricCard fabric={item} onPress={handleFabricPress} />
          ) : (
            <View style={{ flex: 1, margin: 6 }} />
          )
        }
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        /**
         * Pull-to-refresh uses React Query's refetch under the hood.
         * The isRefetching flag comes from useQuery — it's true during
         * background refetches (not the initial load), which is exactly
         * when the pull-to-refresh spinner should show.
         */
        refreshing={isRefetching}
        onRefresh={refetch}
      />

      {/* Detail modal — rendered once, visibility controlled by selectedFabric */}
      <FabricDetailModal fabric={selectedFabric} onClose={handleCloseModal} />
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
