/**
 * StatusBadge — color-coded pill showing an order's current status.
 *
 * Used on the home screen order rows, orders list, and order success screen.
 * Colors are chosen for quick visual scanning — warm colors (amber, orange)
 * for in-progress states, cool colors (blue, purple) for waiting states,
 * green for completion.
 */

import { View, Text, StyleSheet } from "react-native";
import { OrderStatus } from "@/types";

// Status → display label and color mapping.
// Exported so StatusTimeline can reuse the same colors — single source of truth.
export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string }
> = {
  [OrderStatus.PLACED]: {
    label: "Placed",
    bg: "#dbeafe",
    text: "#3b82f6",
  },
  [OrderStatus.IN_PRODUCTION]: {
    label: "In Production",
    bg: "#fef3c7",
    text: "#f59e0b",
  },
  [OrderStatus.READY_FOR_TRIAL]: {
    label: "Ready for Trial",
    bg: "#ede9fe",
    text: "#8b5cf6",
  },
  [OrderStatus.TRIAL_COMPLETE]: {
    label: "Trial Complete",
    bg: "#e0e7ff",
    text: "#6366f1",
  },
  [OrderStatus.ALTERATIONS]: {
    label: "Alterations",
    bg: "#ffedd5",
    text: "#f97316",
  },
  [OrderStatus.READY_FOR_DELIVERY]: {
    label: "Ready for Delivery",
    bg: "#d1fae5",
    text: "#10b981",
  },
  [OrderStatus.DELIVERED]: {
    label: "Delivered",
    bg: "#dcfce7",
    text: "#22c55e",
  },
};

interface StatusBadgeProps {
  status: OrderStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
  },
});
