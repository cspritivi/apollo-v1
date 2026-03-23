/**
 * Cart Screen — shows configured items waiting to be ordered.
 *
 * The customer adds items from the configurator's review step ("Add to Cart")
 * and checks out here. Each item becomes a separate order row in Supabase
 * because each garment is produced independently with its own timeline.
 *
 * WHY BATCH INSERT ON CHECKOUT:
 * All cart items are submitted in a single .insert([rows]) call. This is
 * atomic: all succeed or all fail. The customer taps "Place Order" once and
 * expects one outcome — not a partial success where 2 of 3 items go through.
 * On failure, the cart is retained so the customer can retry.
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useCartStore } from "../../src/stores/cartStore";
import { useCreateOrders } from "../../src/features/orders/hooks";
import { useSession } from "../../src/hooks/useSession";
import CartItemCard from "../../src/features/orders/components/CartItemCard";
import { CreateOrderInput } from "../../src/features/orders/api";

export default function CartScreen() {
  const router = useRouter();
  const { session } = useSession();

  // --- Cart state ---
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice());
  const itemCount = useCartStore((s) => s.itemCount());
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  // --- Batch order creation ---
  const createOrdersMutation = useCreateOrders();

  const formatPrice = (cents: number) => {
    const prefix = cents < 0 ? "-" : "";
    return `${prefix}$${(Math.abs(cents) / 100).toFixed(2)}`;
  };

  // --- Checkout handler ---
  // Builds order payloads from cart items and submits as a batch.
  // On success: clears cart and navigates to success screen.
  // On failure: cart is retained, error shown, customer can retry.
  const handleCheckout = () => {
    if (!session || items.length === 0) return;

    const orderInputs: CreateOrderInput[] = items.map((item) => ({
      profileId: session.user.id,
      productId: item.product.id,
      fabricId: item.fabric.id,
      chosenOptions: item.selectedOptions,
      basePrice: item.product.base_price,
      fabricPricePerMeter: item.fabric.price_per_meter,
      fabricMeters: item.product.fabric_meters,
      customerNotes: item.customerNotes,
    }));

    createOrdersMutation.mutate(orderInputs, {
      onSuccess: () => {
        clearCart();
        router.replace("/order-success");
      },
      onError: () => {
        // Cart is retained — customer can retry
        Alert.alert(
          "Order Failed",
          "Could not place your order. Please try again.",
        );
      },
    });
  };

  // --- Empty state ---
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>
          Configure a product and add it to your cart
        </Text>
        <Pressable
          style={styles.browseButton}
          onPress={() => router.replace("/products")}
          accessibilityRole="button"
          accessibilityLabel="Browse Products"
        >
          <Text style={styles.browseButtonText}>Browse Products</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cart items list */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <CartItemCard
            key={item.id}
            item={item}
            onRemove={removeItem}
            formatPrice={formatPrice}
          />
        ))}
      </ScrollView>

      {/* Order summary — fixed at bottom */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </Text>
          <Text style={styles.summaryTotal}>{formatPrice(totalPrice)}</Text>
        </View>

        <Pressable
          style={[
            styles.checkoutButton,
            createOrdersMutation.isPending && styles.checkoutButtonDisabled,
          ]}
          onPress={handleCheckout}
          disabled={createOrdersMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Place Order"
        >
          {createOrdersMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.checkoutButtonText}>Place Order</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  // --- Empty state ---
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#4f46e5",
    borderRadius: 10,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // --- Summary bar ---
  summaryBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  checkoutButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  checkoutButtonDisabled: {
    backgroundColor: "#a5b4fc",
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
