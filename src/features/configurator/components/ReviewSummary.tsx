import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import AppImage from "@/components/AppImage";
import { Product, Fabric, ProductOption } from "@/types";
import { calculatePrice } from "@/features/orders/utils/calculatePrice";
import { formatOptionGroupTitle } from "@/features/configurator/components/OptionStep";
import FitGuaranteeBadge from "@/components/FitGuaranteeBadge";

/**
 * ReviewSummary — the final step of the configurator wizard.
 *
 * Shows a visual recap of every choice the customer has made: product,
 * fabric, each selected option (with images), and a total price breakdown.
 * Also includes a text input for customer notes (e.g., "Slightly shorter
 * sleeves please").
 *
 * WHY A VISUAL RECAP (NOT JUST A TEXT LIST):
 * Customers made their choices based on images. The review should mirror
 * that visual language — showing the lapel image they picked alongside
 * "Peak Lapel" confirms their choice much better than text alone. This
 * reduces order errors and builds confidence before placement.
 *
 * WHY PRICE BREAKDOWN HERE (NOT ON EACH STEP):
 * Showing running totals on every step creates price anxiety — customers
 * focus on cost instead of preference. A single breakdown at the end lets
 * them configure freely, then evaluate the total. This is a common pattern
 * in e-commerce configurators (Tesla, Nike By You, Indochino).
 *
 * WHY TAPPABLE SELECTIONS:
 * Each selected item (fabric, option) is tappable — tapping jumps back to
 * the corresponding configurator step via onGoToStep. This lets customers
 * quickly change a choice from the review without navigating back step by
 * step. The "Edit" label and chevron hint at the interaction. Step mapping:
 * fabric = step 0, option_groups[i] = step i+1.
 */

interface ReviewSummaryProps {
  product: Product;
  fabric: Fabric | null;
  selectedOptions: Record<string, ProductOption>;
  customerNotes: string;
  onChangeNotes: (notes: string) => void;
  /** Jump to a configurator step (0 = fabric, 1..N = option groups) */
  onGoToStep: (step: number) => void;
}

export default function ReviewSummary({
  product,
  fabric,
  selectedOptions,
  customerNotes,
  onChangeNotes,
  onGoToStep,
}: ReviewSummaryProps) {
  // Price calculation uses the shared calculatePrice utility — single source of
  // truth for the pricing formula across ReviewSummary, cart, and order creation.
  const basePriceCents = product.base_price;
  const fabricPricePerMeter = fabric ? fabric.price_per_meter : 0;
  // Fabric cost line item: price_per_meter × fabric_meters (e.g., $25/m × 2.5m)
  const fabricCostCents = fabricPricePerMeter * product.fabric_meters;
  const totalCents = calculatePrice(
    basePriceCents,
    fabricPricePerMeter,
    product.fabric_meters,
    selectedOptions,
  );

  const formatPrice = (cents: number) => {
    const prefix = cents < 0 ? "-" : "";
    return `${prefix}$${(Math.abs(cents) / 100).toFixed(2)}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Review Your Configuration</Text>
      <Text style={styles.subtitle}>Tap any selection to change it</Text>

      {/* Product summary — not tappable (can't change which product you're configuring) */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Product</Text>
        <View style={styles.itemRow}>
          <AppImage
            source={product.image_url}
            style={styles.thumbnail}
            fallbackText={product.name.charAt(0)}
            fallbackStyle={styles.thumbnailFallback}
            fallbackTextStyle={styles.fallbackText}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{product.name}</Text>
            <Text style={styles.itemPrice}>
              Base price: {formatPrice(basePriceCents)}
            </Text>
          </View>
        </View>
      </View>

      {/* Fabric summary — tappable to jump back to fabric step (step 0) */}
      <Pressable
        style={styles.section}
        onPress={() => onGoToStep(0)}
        accessibilityRole="button"
        accessibilityLabel={`Edit fabric selection${fabric ? `: ${fabric.name}` : ""}`}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fabric</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        {fabric ? (
          <View style={styles.itemRow}>
            <AppImage source={fabric.image_url} style={styles.thumbnail} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{fabric.name}</Text>
              <Text style={styles.itemPrice}>
                {formatPrice(fabric.price_per_meter)}/m
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.notSelected}>No fabric selected</Text>
        )}
      </Pressable>

      {/* Selected options — one tappable row per option group.
          Each option maps to step index i+1 (step 0 is fabric). */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Options</Text>
        {product.option_groups.map((group, index) => {
          const selected = selectedOptions[group];
          // Option groups map to steps 1..N (step 0 is fabric).
          const stepIndex = index + 1;
          return (
            <Pressable
              key={group}
              style={styles.optionRow}
              onPress={() => onGoToStep(stepIndex)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${formatOptionGroupTitle(group)}${selected ? `: ${selected.name}` : ""}`}
            >
              <View style={styles.optionRowHeader}>
                <Text style={styles.optionGroupLabel}>
                  {formatOptionGroupTitle(group)}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </View>
              {selected ? (
                <View style={styles.itemRow}>
                  <AppImage
                    source={selected.image_url}
                    style={styles.optionThumbnail}
                    fallbackText={selected.name.charAt(0)}
                    fallbackStyle={styles.thumbnailFallback}
                    fallbackTextStyle={styles.fallbackTextSmall}
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.optionName}>{selected.name}</Text>
                    {selected.price_modifier !== 0 && (
                      <Text style={styles.itemPrice}>
                        {selected.price_modifier > 0 ? "+" : ""}
                        {formatPrice(selected.price_modifier)}
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.notSelected}>Not selected</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Customer notes */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
          Notes for Tailor
        </Text>
        <TextInput
          style={styles.notesInput}
          value={customerNotes}
          onChangeText={onChangeNotes}
          placeholder="Any special requests? (e.g., 'Slightly shorter sleeves')"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          accessibilityLabel="Notes for tailor"
        />
      </View>

      {/* Fit guarantee — full banner placed right before price breakdown,
          the moment of highest purchase anxiety in the configurator flow. */}
      <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <FitGuaranteeBadge variant="full" />
      </View>

      {/* Price breakdown */}
      <View style={[styles.section, styles.priceSection]}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
          Price Breakdown
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Base ({product.name})</Text>
          <Text style={styles.priceValue}>{formatPrice(basePriceCents)}</Text>
        </View>

        {fabric && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              Fabric ({fabric.name}, {product.fabric_meters}m)
            </Text>
            <Text style={styles.priceValue}>
              {formatPrice(fabricCostCents)}
            </Text>
          </View>
        )}

        {Object.entries(selectedOptions).map(([group, option]) =>
          option.price_modifier !== 0 ? (
            <View key={group} style={styles.priceRow}>
              <Text style={styles.priceLabel}>{option.name}</Text>
              <Text style={styles.priceValue}>
                {option.price_modifier > 0 ? "+" : ""}
                {formatPrice(option.price_modifier)}
              </Text>
            </View>
          ) : null,
        )}

        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Estimated Total</Text>
          <Text style={styles.totalValue}>{formatPrice(totalCents)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    paddingBottom: 120, // Room for nav buttons at bottom
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
    paddingBottom: 16,
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    // Subtle shadow for card-like appearance
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  chevron: {
    fontSize: 20,
    color: "#9ca3af",
    fontWeight: "600",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  optionThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  thumbnailFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#9ca3af",
  },
  fallbackTextSmall: {
    fontSize: 16,
    fontWeight: "700",
    color: "#9ca3af",
  },
  itemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  itemPrice: {
    fontSize: 13,
    color: "#4f46e5",
    fontWeight: "500",
    marginTop: 2,
  },
  optionRow: {
    marginBottom: 12,
  },
  optionRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  optionGroupLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  notSelected: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 80,
    backgroundColor: "#f9fafb",
  },
  priceSection: {
    marginBottom: 24,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4f46e5",
  },
});
