/**
 * Order Detail Screen — shows full order information and status timeline.
 *
 * Accessed by tapping an OrderRow from the Home screen or Orders list.
 * Uses `useOrder(orderId)` which fetches the order with joined product/fabric
 * names in a single Supabase query (see fetchOrderById in api.ts).
 *
 * ARCHITECTURAL DECISION: This screen is a hidden tab (href: null) rather than
 * a Stack screen. It lives inside the (app) Tabs layout so it gets auth
 * protection for free, and the back button returns to the previous tab.
 * The orderId is passed via search params — Expo Router's useLocalSearchParams.
 */

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { useOrder } from "../../src/features/orders/hooks";
import { OrderStatus } from "../../src/types";
import StatusBadge from "../../src/features/orders/components/StatusBadge";
import StatusTimeline from "../../src/features/orders/components/StatusTimeline";
import { formatDate } from "../../src/features/orders/utils/formatDate";
import { formatOptionGroupTitle } from "../../src/features/configurator/components/OptionStep";

export default function OrderDetailScreen() {
  const { orderId, from } = useLocalSearchParams<{
    orderId: string;
    from?: string;
  }>();
  const { data: order, isLoading, error } = useOrder(orderId);
  const navigation = useNavigation();
  const router = useRouter();

  /**
   * WORKAROUND: Hidden tab screens don't maintain a proper back stack, so
   * router.back() can skip intermediate screens (e.g., Home → Orders →
   * Detail → back goes to Home, skipping Orders). We override headerLeft
   * to navigate explicitly to the `from` screen. This will be replaced
   * by nested Stack navigators — see GitHub issue.
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => {
            if (from) {
              router.navigate(
                from.startsWith("/") ? from : (`/${from}` as any),
              );
            } else {
              router.back();
            }
          }}
          hitSlop={8}
          style={{ marginLeft: 8 }}
        >
          <Text style={{ fontSize: 16, color: "#4f46e5" }}>← Back</Text>
        </Pressable>
      ),
    });
  }, [navigation, router, from]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error
            ? "Failed to load order. Please try again."
            : "Order not found."}
        </Text>
      </View>
    );
  }

  // Format price from cents to display string
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Extract product/fabric names from the joined query result
  const productName = order.products?.name ?? "Custom Item";
  const fabricName = order.fabrics?.name ?? "Custom Fabric";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header — product name, fabric, status, and date */}
      <View style={styles.header}>
        <Text style={styles.productName}>{productName}</Text>
        <Text style={styles.fabricName}>{fabricName}</Text>
        <View style={styles.headerRow}>
          <StatusBadge status={order.current_status as OrderStatus} />
          <Text style={styles.date}>
            Ordered {formatDate(order.created_at)}
          </Text>
        </View>
      </View>

      {/* Timeline Card — full status history */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Timeline</Text>
        <StatusTimeline statusHistory={order.status_history} />
      </View>

      {/* Details Card — chosen options, price, and notes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Details</Text>

        {/* Chosen options — iterate the JSONB snapshot from the order */}
        {Object.entries(order.chosen_options).map(([group, option]) => (
          <View key={group} style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {formatOptionGroupTitle(group)}
            </Text>
            <Text style={styles.detailValue}>{option.name}</Text>
          </View>
        ))}

        {/* Price */}
        <View style={[styles.detailRow, styles.priceRow]}>
          <Text style={styles.priceLabel}>Total</Text>
          <Text style={styles.priceValue}>
            {formatPrice(order.final_price)}
          </Text>
        </View>

        {/* Customer notes — only shown when present */}
        {order.customer_notes && (
          <View style={styles.notesSection}>
            <Text style={styles.detailLabel}>Notes</Text>
            <Text style={styles.notesText}>{order.customer_notes}</Text>
          </View>
        )}
      </View>

      {/* Order reference — truncated ID for customer support */}
      <Text style={styles.reference}>
        Order ref: {order.id.slice(0, 8).toUpperCase()}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
  },

  // Header
  header: {
    marginBottom: 16,
  },
  productName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  fabricName: {
    fontSize: 15,
    color: "#6b7280",
    marginTop: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  date: {
    fontSize: 13,
    color: "#9ca3af",
  },

  // Cards
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    // Subtle shadow for card elevation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },

  // Detail rows
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },

  // Price row — visually distinct from option rows
  priceRow: {
    marginTop: 4,
    borderBottomWidth: 0,
  },
  priceLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  priceValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4f46e5",
  },

  // Notes
  notesSection: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  notesText: {
    fontSize: 14,
    color: "#374151",
    marginTop: 4,
    lineHeight: 20,
  },

  // Order reference
  reference: {
    textAlign: "center",
    fontSize: 12,
    color: "#d1d5db",
    marginTop: 8,
  },
});
