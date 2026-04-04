import { useState, useCallback, useMemo, useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useNavigation } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  useFabrics,
  useSavedFabrics,
  useSaveFabric,
  useUnsaveFabric,
} from "../../../../src/features/catalog/hooks";
import SavedFabricCard from "../../../../src/features/catalog/components/SavedFabricCard";
import FabricDetailModal from "../../../../src/features/catalog/components/FabricDetailModal";
import { useSession } from "../../../../src/hooks/useSession";
import { Fabric } from "../../../../src/types";

/**
 * Saved Fabrics screen — shows all fabrics the customer has bookmarked.
 *
 * ARCHITECTURE:
 * This screen composes data from TWO queries:
 * 1. useSavedFabrics — fetches the junction table rows (just IDs + timestamps)
 * 2. useFabrics — fetches the full fabric catalog (already cached from the
 *    catalog screen in most cases)
 *
 * WHY TWO QUERIES (NOT A JOIN):
 * The full fabric data is almost certainly already in React Query's cache
 * from browsing the catalog tab. Doing a server-side join (saved_fabrics
 * JOIN fabrics) would fetch fabric details we already have — wasting
 * bandwidth. Instead, we fetch the lightweight saved IDs and match them
 * against the cached fabric data client-side.
 *
 * This is a pattern called "cache-first composition" — let React Query's
 * cache do the work instead of making the server re-send data.
 */
export default function SavedFabricsScreen() {
  const { session } = useSession();
  const userId = session?.user?.id;
  const navigation = useNavigation();

  const { data: savedFabrics, isLoading: isSavedLoading } =
    useSavedFabrics(userId);

  const { data: allFabrics, isLoading: isFabricsLoading } = useFabrics({
    availableOnly: true,
  });

  const saveMutation = useSaveFabric(userId ?? "");
  const unsaveMutation = useUnsaveFabric(userId ?? "");

  const [selectedFabric, setSelectedFabric] = useState<Fabric | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  /**
   * Reset ephemeral UI state when the screen gains focus.
   *
   * WHY useFocusEffect (NOT useEffect):
   * useEffect runs on mount/unmount. But React Navigation keeps screens
   * mounted when you navigate away (for performance — preserves scroll
   * position, avoids re-fetching). useFocusEffect runs every time the
   * screen becomes visible, even if it was already mounted. This ensures
   * the user always arrives at a clean state — no lingering edit mode
   * or open modals from a previous visit.
   *
   * WHY useCallback WRAPPER:
   * useFocusEffect requires a stable callback (same as useEffect's
   * dependency contract). Without useCallback, React would warn about
   * an unstable reference causing the effect to re-run on every render.
   */
  useFocusEffect(
    useCallback(() => {
      setIsEditing(false);
      setSelectedFabric(null);
    }, []),
  );

  /**
   * DERIVED STATE: Match saved fabric IDs against the full catalog to get
   * complete Fabric objects for rendering.
   *
   * WHY A Map FOR LOOKUP:
   * Building a Map<id, Fabric> from the catalog gives O(1) lookups per
   * saved fabric ID. With an array, each lookup would be O(n) — fine for
   * 20 fabrics, but the Map approach is both faster and more idiomatic.
   * It also handles the case where a saved fabric was soft-deleted
   * (available = false) — it simply won't appear in the map, so removed
   * fabrics silently disappear from the saved list.
   */
  const savedFabricDetails = useMemo(() => {
    if (!savedFabrics || !allFabrics) return [];

    const fabricMap = new Map(allFabrics.map((f) => [f.id, f]));

    // Preserve the saved order (most recently saved first, from the API).
    // filter out any fabrics that are no longer available (not in the map).
    return savedFabrics
      .map((s) => fabricMap.get(s.fabric_id))
      .filter((f): f is Fabric => f !== undefined);
  }, [savedFabrics, allFabrics]);

  /**
   * WHY useLayoutEffect FOR HEADER BUTTONS (NOT useEffect):
   * useLayoutEffect runs synchronously after render but before the browser
   * paints. This prevents a flash where the header renders without the
   * Edit/Done button before it gets added. useEffect would cause a visible
   * flicker because it runs after paint.
   *
   * WHY navigation.setOptions (NOT INLINE IN _layout.tsx):
   * The Edit/Done button needs access to component state (isEditing) and
   * the list length (to hide Edit when empty). Defining it in _layout.tsx
   * would require lifting state up or using a context — unnecessarily
   * complex. setOptions lets us keep the state local to this screen.
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        savedFabricDetails.length > 0 ? (
          <Pressable
            onPress={() => setIsEditing((prev) => !prev)}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>
              {isEditing ? "Done" : "Edit"}
            </Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, isEditing, savedFabricDetails.length]);

  const handleFabricPress = useCallback((fabric: Fabric) => {
    setSelectedFabric(fabric);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedFabric(null);
  }, []);

  const handleDelete = useCallback(
    (fabricId: string) => {
      unsaveMutation.mutate(fabricId);
    },
    [unsaveMutation],
  );

  /**
   * Toggle save/unsave from the detail modal. Unlike handleDelete (which
   * only unsaves), this allows the user to re-save a fabric they just
   * unsaved — supporting the "change my mind" flow before dismissing.
   */
  const handleModalToggleSave = useCallback(
    (fabricId: string) => {
      if (savedFabricDetails.some((f) => f.id === fabricId)) {
        unsaveMutation.mutate(fabricId);
      } else {
        saveMutation.mutate(fabricId);
      }
    },
    [savedFabricDetails, saveMutation, unsaveMutation],
  );

  // --- Loading state ---
  if (isSavedLoading || isFabricsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading saved fabrics...</Text>
      </View>
    );
  }

  /**
   * Derive whether the currently selected fabric (in the modal) is still saved.
   * This replaces the previous hardcoded isSaved={true}.
   *
   * WHY NOT HARDCODE isSaved={true} ON THE SAVED FABRICS SCREEN:
   * When the user unsaves a fabric from the detail modal, the optimistic
   * update removes it from savedFabricDetails. If isSaved is hardcoded to
   * true, the modal still shows "Fabric Saved ✓" even though it's been
   * unsaved — confusing and prevents re-saving. Deriving it from actual
   * data keeps the modal in sync with the real save state.
   */
  const isSelectedFabricSaved = selectedFabric
    ? savedFabricDetails.some((f) => f.id === selectedFabric.id)
    : false;

  return (
    <View style={styles.container}>
      {/* Show empty state OR the list, but always render the modal below
          so it stays visible even if the user unsaves the last fabric
          while the modal is open. The user should be able to browse the
          detail view and change their mind before dismissing. */}
      {savedFabricDetails.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No saved fabrics</Text>
          <Text style={styles.emptyMessage}>
            Browse the catalog and tap the + button to save fabrics you like.
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedFabricDetails}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SavedFabricCard
              fabric={item}
              onPress={handleFabricPress}
              isEditing={isEditing}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal is always rendered regardless of list state — ensures it
          stays visible when the user unsaves the currently viewed fabric.
          The modal only dismisses when the user explicitly closes it. */}
      <FabricDetailModal
        fabric={selectedFabric}
        onClose={handleCloseModal}
        isSaved={isSelectedFabricSaved}
        onToggleSave={handleModalToggleSave}
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
    paddingVertical: 10,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4f46e5",
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
