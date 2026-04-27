import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { padGridData } from "@/lib/gridUtils";
import {
  useFabrics,
  useSavedFabrics,
  useSaveFabric,
  useUnsaveFabric,
} from "@/features/catalog/hooks";
import FabricCard from "@/features/catalog/components/FabricCard";
import FabricDetailModal from "@/features/catalog/components/FabricDetailModal";
import ColorFilterBar from "@/features/catalog/components/ColorFilterBar";
import { useSession } from "@/hooks/useSession";
import { Fabric } from "@/types";
import { useRecentlyViewedStore } from "@/stores/recentlyViewedStore";

/**
 * Fabrics catalog screen — browsable grid of available fabrics.
 *
 * ARCHITECTURE:
 * This screen composes the 3-layer pattern: Screen → Hook → API.
 * - useFabrics hook handles caching, loading, and error states via React Query
 * - FabricCard renders each item in the grid
 * - FabricDetailModal shows full details when a card is tapped
 *
 * WHY FlashList (NOT FlatList OR ScrollView):
 * FlashList recycles cells like native UICollectionView / RecyclerView,
 * maintaining 60fps even with 100+ items. FlatList virtualizes but doesn't
 * recycle — it creates new cell components as you scroll, which causes stutter
 * on mid-range Android with large catalogs. ScrollView would mount all items
 * at once, causing slow initial render and high memory usage.
 *
 * WHY availableOnly: true:
 * Customers should only see fabrics that are currently in stock. The tailor
 * manages availability via the Supabase dashboard. Out-of-stock fabrics are
 * soft-deleted (available = false), not removed, so they remain in existing orders.
 */
export default function FabricsScreen() {
  const { session } = useSession();
  const userId = session?.user?.id;

  const {
    data: fabrics,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useFabrics({
    availableOnly: true,
    // Gate on session to prevent firing before the JWT is available.
    // Without this, RLS returns an empty array on cold start and React
    // Query caches it for the full staleTime window.
    enabled: !!session,
  });

  // Fetch saved fabric IDs to show save state on each card.
  const { data: savedFabrics } = useSavedFabrics(userId);
  const saveMutation = useSaveFabric(userId ?? "");
  const unsaveMutation = useUnsaveFabric(userId ?? "");

  /**
   * DERIVED STATE: A Set of saved fabric IDs for O(1) lookups.
   * Each FabricCard needs to know if it's saved — checking a Set is
   * instant vs scanning an array on every card render. This is rebuilt
   * only when savedFabrics changes (via useMemo).
   */
  const savedFabricIds = useMemo(() => {
    if (!savedFabrics) return new Set<string>();
    return new Set(savedFabrics.map((s) => s.fabric_id));
  }, [savedFabrics]);

  // Plain array of saved IDs for FlashList's extraData. FlashList uses
  // referential equality to decide when to re-render cells — a Set's identity
  // doesn't change on mutation, but a new array is created each time
  // savedFabrics changes (via useMemo), triggering the correct re-render.
  const savedFabricIdArray = useMemo(
    () => Array.from(savedFabricIds),
    [savedFabricIds],
  );

  // Selected fabric controls modal visibility (null = modal hidden).
  // Single state variable instead of separate `selectedFabric` + `isModalOpen`.
  const [selectedFabric, setSelectedFabric] = useState<Fabric | null>(null);

  // Active color filter — null means "show all" (no filter applied).
  // Single-select: only one color can be active at a time.
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  /**
   * DERIVED STATE WITH useMemo — two key concepts here:
   *
   * 1. uniqueColors: Extracts all distinct color tags from the full fabric list.
   *    Uses a Set for O(1) deduplication — flatMap collects every tag from every
   *    fabric into one array, then Set removes duplicates, then spread converts
   *    back to an array. Sorted alphabetically for stable, predictable pill order.
   *
   * 2. filteredFabrics: Client-side filtering instead of a second server query.
   *    WHY CLIENT-SIDE HERE: With ~20 fabrics, filtering in memory is instant.
   *    The server-side colorTag filter in api.ts exists for when the catalog
   *    scales to hundreds of items — at that point you'd pass colorTag to
   *    useFabrics and let Postgres handle it (with its array containment index).
   *    For now, client-side avoids an extra network round-trip and leverages
   *    the data already in React Query's cache.
   *
   * WHY useMemo (NOT a regular variable):
   * Without useMemo, these arrays would be recalculated on every render —
   * including renders triggered by unrelated state changes (like opening
   * the detail modal). useMemo caches the result and only recomputes when
   * fabrics or selectedColor changes. This matters because flatMap + Set +
   * sort + filter is non-trivial work, and the FlatList below would also
   * re-render if its data reference changes (referential equality check).
   */
  const uniqueColors = useMemo(() => {
    if (!fabrics) return [];
    const tagSet = new Set(fabrics.flatMap((f) => f.color_tags));
    return [...tagSet].sort();
  }, [fabrics]);

  const filteredFabrics = useMemo(() => {
    if (!fabrics) return [];
    if (!selectedColor) return fabrics;
    // .includes() checks if the fabric's color_tags array contains the
    // selected color — mirrors what the Postgres @> operator does server-side.
    return fabrics.filter((f) => f.color_tags.includes(selectedColor));
  }, [fabrics, selectedColor]);

  /**
   * WHY useCallback:
   * This function is passed as a prop to each FabricCard. Without useCallback,
   * a new function reference is created on every render, causing every card to
   * re-render even if the data hasn't changed. useCallback memoizes the reference.
   */
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addItem);

  const handleFabricPress = useCallback(
    (fabric: Fabric) => {
      setSelectedFabric(fabric);
      // Record this fabric as recently viewed for the browse-to-purchase loop
      addRecentlyViewed({
        id: fabric.id,
        type: "fabric",
        name: fabric.name,
        imageUrl: fabric.image_url,
        price: fabric.price_per_meter,
      });
    },
    [addRecentlyViewed],
  );

  const handleCloseModal = useCallback(() => {
    setSelectedFabric(null);
  }, []);

  /**
   * Toggle save/unsave for a fabric. Checks the derived Set to decide
   * whether to save or unsave — this is where the O(1) Set lookup pays off.
   * Each card calls this with its fabric ID on button press.
   */
  const handleToggleSave = useCallback(
    (fabricId: string) => {
      if (savedFabricIds.has(fabricId)) {
        unsaveMutation.mutate(fabricId);
      } else {
        saveMutation.mutate(fabricId);
      }
    },
    [savedFabricIds, saveMutation, unsaveMutation],
  );

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
  // Wrapped in ScrollView with RefreshControl so the user can pull to retry
  // instead of being stuck on a dead-end screen.
  if (error) {
    return (
      <ScrollView
        contentContainerStyle={styles.centered}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </ScrollView>
    );
  }

  // --- Empty state (all fabrics unavailable or none seeded) ---
  if (!fabrics || fabrics.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.centered}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <Text style={styles.emptyTitle}>No fabrics available</Text>
        <Text style={styles.emptyMessage}>
          Check back soon — new fabrics are added regularly.
        </Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Color filter bar — sits above the grid, scrolls horizontally.
          Rendered outside the FlatList so it stays pinned at the top and
          doesn't scroll away with the fabric grid. This is a common pattern
          for filter UIs — the filter controls remain visible so users can
          always see and change the active filter without scrolling back up. */}
      <ColorFilterBar
        colors={uniqueColors}
        selectedColor={selectedColor}
        onSelectColor={setSelectedColor}
      />

      {/* FlashList with cell recycling for smooth scrolling on large catalogs.
          numColumns={2} creates the standard product grid layout.
          extraData ensures cells re-render when save state changes — without it,
          recycled cells could show stale save button state. */}
      <FlashList<Fabric | null>
        data={padGridData(filteredFabrics)}
        keyExtractor={(item, index) => item?.id ?? `spacer-${index}`}
        numColumns={2}
        // savedFabricIdArray changes identity when save state changes,
        // forcing FlashList to re-render cells with updated isSaved props.
        extraData={savedFabricIdArray}
        renderItem={({ item }) =>
          item ? (
            <FabricCard
              fabric={item}
              onPress={handleFabricPress}
              isSaved={savedFabricIds.has(item.id)}
              onToggleSave={handleToggleSave}
            />
          ) : (
            <View style={{ flex: 1, margin: 6 }} />
          )
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
      />

      {/* Detail modal — rendered once, visibility controlled by selectedFabric */}
      <FabricDetailModal
        fabric={selectedFabric}
        onClose={handleCloseModal}
        isSaved={selectedFabric ? savedFabricIds.has(selectedFabric.id) : false}
        onToggleSave={handleToggleSave}
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
