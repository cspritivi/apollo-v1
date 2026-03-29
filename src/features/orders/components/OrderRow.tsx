/**
 * OrderRow — displays a single order in the home screen or orders list.
 *
 * Shows price, status badge, and date placed. Supports an optional `onPress`
 * prop for navigation to the order detail screen. When `onPress` is provided,
 * the row wraps in a Pressable and shows a chevron indicator; otherwise it
 * renders as a plain View for backward-compatibility.
 *
 * ARCHITECTURAL DECISION: Navigation is wired at the screen level via the
 * onPress callback, not inside this component. This keeps OrderRow a pure
 * presentational component that doesn't depend on the router.
 */

import { View, Text, Pressable, StyleSheet } from "react-native";
import { Order, OrderStatus } from "../../../types";
import StatusBadge from "./StatusBadge";

interface OrderRowProps {
  order: Order;
  /** Optional press handler — when provided, the row becomes tappable with a chevron. */
  onPress?: (order: Order) => void;
}

export default function OrderRow({ order, onPress }: OrderRowProps) {
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

  const content = (
    <>
      <View style={styles.info}>
        <Text style={styles.price}>{formatPrice(order.final_price)}</Text>
        <Text style={styles.date}>{dateStr}</Text>
      </View>
      <StatusBadge status={order.current_status as OrderStatus} />
      {/* Chevron indicator signals the row is tappable — only shown when onPress is provided */}
      {onPress && <Text style={styles.chevron}>›</Text>}
    </>
  );

  // Wrap in Pressable only when tappable — avoids unnecessary accessibility
  // overhead and keeps the non-tappable version as a plain View
  if (onPress) {
    return (
      <Pressable
        testID="order-row"
        style={styles.row}
        onPress={() => onPress(order)}
        // Explicit accessibilityLabel so Maestro can find rows by status.
        // iOS groups all child text into one opaque string — this gives us
        // a predictable format: "$127.50, Delivered, Mar 28, 2026"
        accessibilityLabel={`${formatPrice(order.final_price)}, ${order.current_status}, ${dateStr}`}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
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
  chevron: {
    fontSize: 20,
    color: "#9ca3af",
    marginLeft: 8,
  },
});
