import { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import AppImage from "@/components/AppImage";
import { Fabric } from "@/types";
import { padGridData } from "@/lib/gridUtils";
import { useFabrics } from "@/features/catalog/hooks";
import ColorFilterBar from "@/features/catalog/components/ColorFilterBar";

/**
 * FabricSelectionStep — the first step of the configurator wizard.
 *
 * Reuses the existing fabric catalog data layer (useFabrics hook) and
 * ColorFilterBar component. Renders a simplified version of the fabric
 * grid focused on selection rather than browsing — no save buttons,
 * no detail modal, just tap-to-select with a clear visual indicator.
 *
 * WHY REUSE THE HOOK BUT NOT FabricCard:
 * FabricCard has save/unsave functionality and onPress opens a detail modal.
 * The configurator needs different behavior: onPress selects the fabric for
 * the order. Rather than adding mode flags to FabricCard (which would
 * complicate it), we use a simpler inline card with selection styling.
 * The data layer (useFabrics hook) is fully reusable — only the presentation
 * changes.
 *
 * WHY CLIENT-SIDE FILTERING (SAME AS CATALOG):
 * The fabric catalog has ~20 entries. Filtering in memory with useMemo is
 * fast and avoids a network round-trip per filter change. The same pattern
 * from the main catalog screen applies here. See CLAUDE.md "Open Decisions"
 * for when this should move to server-side.
 */

interface FabricSelectionStepProps {
  selectedFabric: Fabric | null;
  onSelectFabric: (fabric: Fabric) => void;
}

export default function FabricSelectionStep({
  selectedFabric,
  onSelectFabric,
}: FabricSelectionStepProps) {
  const { data: fabrics, isLoading, isError } = useFabrics();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Extract unique color tags from all fabrics for the filter bar.
  // useMemo prevents recalculating on every render — only recalculates
  // when the fabrics array changes (which is rare — it's cached by React Query).
  const uniqueColors = useMemo(() => {
    if (!fabrics) return [];
    const colorSet = new Set<string>();
    fabrics.forEach((f) => f.color_tags.forEach((tag) => colorSet.add(tag)));
    return Array.from(colorSet).sort();
  }, [fabrics]);

  // Filter fabrics by selected color tag (client-side).
  const filteredFabrics = useMemo(() => {
    if (!fabrics) return [];
    if (!selectedColor) return fabrics;
    return fabrics.filter((f) => f.color_tags.includes(selectedColor));
  }, [fabrics, selectedColor]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading fabrics...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load fabrics</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Fabric</Text>
      <Text style={styles.subtitle}>
        {selectedFabric
          ? `Selected: ${selectedFabric.name}`
          : "Tap a fabric to select it"}
      </Text>

      <ColorFilterBar
        colors={uniqueColors}
        selectedColor={selectedColor}
        onSelectColor={setSelectedColor}
      />

      {/* FlashList with cell recycling for smooth scrolling.
          extraData ensures cells re-render when the selected fabric changes —
          without it, recycled cells could show stale selection borders. */}
      <FlashList<Fabric | null>
        data={padGridData(filteredFabrics)}
        keyExtractor={(item, index) => item?.id ?? `spacer-${index}`}
        numColumns={2}
        extraData={selectedFabric?.id}
        renderItem={({ item }) => {
          if (!item) {
            return <View style={{ flex: 1, margin: 6 }} />;
          }

          const isSelected = selectedFabric?.id === item.id;
          const priceDisplay = `$${(item.price_per_meter / 100).toFixed(2)}/m`;

          return (
            <Pressable
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => onSelectFabric(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.name}, ${priceDisplay}${isSelected ? ", selected" : ""}`}
            >
              <AppImage source={item.image_url} style={styles.image} />

              {isSelected && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>✓</Text>
                </View>
              )}

              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.price}>{priceDisplay}</Text>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  grid: {
    paddingHorizontal: 6,
    paddingBottom: 100,
  },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  cardSelected: {
    borderColor: "#4f46e5",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f3f4f6",
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  selectedBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
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
    color: "#4f46e5",
  },
});
