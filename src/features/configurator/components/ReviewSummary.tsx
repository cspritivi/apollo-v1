import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { Product, Fabric, ProductOption } from "../../../types";
import { formatOptionGroupTitle } from "./OptionStep";

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
 */

interface ReviewSummaryProps {
  product: Product;
  fabric: Fabric | null;
  selectedOptions: Record<string, ProductOption>;
  customerNotes: string;
  onChangeNotes: (notes: string) => void;
}

export default function ReviewSummary({
  product,
  fabric,
  selectedOptions,
  customerNotes,
  onChangeNotes,
}: ReviewSummaryProps) {
  // Calculate total price: base + fabric + option modifiers
  const basePriceCents = product.base_price;
  // Fabric price is per meter — the product would define how many meters
  // are needed. For now we display it as a line item (price/m) without
  // multiplying. TODO: multiply by product.fabric_meters when that column exists.
  const fabricPriceCents = fabric ? fabric.price_per_meter : 0;
  const optionModifiersCents = Object.values(selectedOptions).reduce(
    (sum, opt) => sum + opt.price_modifier,
    0,
  );
  const totalCents = basePriceCents + fabricPriceCents + optionModifiersCents;

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
      <Text style={styles.subtitle}>
        Confirm your choices before proceeding
      </Text>

      {/* Product summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product</Text>
        <View style={styles.itemRow}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailFallback]}>
              <Text style={styles.fallbackText}>{product.name.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{product.name}</Text>
            <Text style={styles.itemPrice}>
              Base price: {formatPrice(basePriceCents)}
            </Text>
          </View>
        </View>
      </View>

      {/* Fabric summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fabric</Text>
        {fabric ? (
          <View style={styles.itemRow}>
            <Image
              source={{ uri: fabric.image_url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
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
      </View>

      {/* Selected options — one row per option group */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Options</Text>
        {product.option_groups.map((group) => {
          const selected = selectedOptions[group];
          return (
            <View key={group} style={styles.optionRow}>
              <Text style={styles.optionGroupLabel}>
                {formatOptionGroupTitle(group)}
              </Text>
              {selected ? (
                <View style={styles.itemRow}>
                  {selected.image_url ? (
                    <Image
                      source={{ uri: selected.image_url }}
                      style={styles.optionThumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[styles.optionThumbnail, styles.thumbnailFallback]}
                    >
                      <Text style={styles.fallbackTextSmall}>
                        {selected.name.charAt(0)}
                      </Text>
                    </View>
                  )}
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
            </View>
          );
        })}
      </View>

      {/* Customer notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes for Tailor</Text>
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

      {/* Price breakdown */}
      <View style={[styles.section, styles.priceSection]}>
        <Text style={styles.sectionTitle}>Price Breakdown</Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Base ({product.name})</Text>
          <Text style={styles.priceValue}>{formatPrice(basePriceCents)}</Text>
        </View>

        {fabric && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Fabric ({fabric.name})</Text>
            <Text style={styles.priceValue}>
              {formatPrice(fabricPriceCents)}/m
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
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
  optionGroupLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
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
