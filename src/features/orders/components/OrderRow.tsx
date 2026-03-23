/**
 * OrderRow — displays a single order in the home screen or orders list.
 *
 * Shows product name, fabric name (from chosen_options snapshot or IDs),
 * status badge, and date placed. Tapping is a no-op for now — full order
 * detail view comes with the tracking feature.
 */

import { View, Text, StyleSheet } from "react-native";
import { Order, OrderStatus } from "../../../types";
import StatusBadge from "./StatusBadge";

interface OrderRowProps {
  order: Order;
}

export default function OrderRow({ order }: OrderRowProps) {
  // Format the order date as a readable string
  const dateStr = new Date(order.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Format price from cents to display
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.price}>{formatPrice(order.final_price)}</Text>
        <Text style={styles.date}>{dateStr}</Text>
      </View>
      <StatusBadge status={order.current_status as OrderStatus} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  price: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  date: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
});
