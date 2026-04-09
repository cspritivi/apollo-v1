/**
 * CartItemCard — displays a single configured item in the cart.
 *
 * Shows product name, fabric name, option count, price, and a remove button.
 * Uses image thumbnails with letter fallbacks (same pattern as ReviewSummary).
 *
 * WHY NO "EDIT" BUTTON:
 * Editing a configured item means re-entering the configurator with pre-filled
 * state, which requires the configurator store to support initialization from
 * a cart item. This is deferred. For now, the customer removes and re-configures.
 * Same pattern used by Nike By You and Indochino.
 */

import { View, Text, Pressable, StyleSheet } from "react-native";
import { CartItem } from "@/stores/cartStore";
import AppImage from "@/components/AppImage";

interface CartItemCardProps {
  item: CartItem;
  onRemove: (id: string) => void;
  formatPrice: (cents: number) => string;
}

export default function CartItemCard({
  item,
  onRemove,
  formatPrice,
}: CartItemCardProps) {
  const optionCount = Object.keys(item.selectedOptions).length;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* Product thumbnail */}
        <AppImage
          source={item.product.image_url}
          style={styles.thumbnail}
          fallbackText={item.product.name.charAt(0)}
          fallbackStyle={styles.thumbnailFallback}
          fallbackTextStyle={styles.fallbackText}
        />

        {/* Item details */}
        <View style={styles.info}>
          <Text style={styles.productName}>{item.product.name}</Text>
          <Text style={styles.fabricName}>{item.fabric.name}</Text>
          <Text style={styles.optionCount}>
            {optionCount} option{optionCount !== 1 ? "s" : ""} selected
          </Text>
        </View>

        {/* Price + remove */}
        <View style={styles.actions}>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
          <Pressable
            onPress={() => onRemove(item.id)}
            style={styles.removeButton}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.product.name} from cart`}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      </View>

      {/* Customer notes if present */}
      {item.customerNotes ? (
        <Text style={styles.notes} numberOfLines={2}>
          Note: {item.customerNotes}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
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
  info: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  fabricName: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  optionCount: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  actions: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4f46e5",
  },
  removeButton: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ef4444",
  },
  notes: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
});
