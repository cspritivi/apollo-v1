/**
 * AlterationStatusBadge — color-coded pill showing an alteration's status.
 *
 * Follows the same visual pattern as the order StatusBadge but with
 * alteration-specific statuses and a distinct color palette to help
 * customers differentiate alteration status from order status at a glance.
 *
 * COLOR CHOICES:
 * - Requested: blue (new, awaiting action)
 * - In Progress: amber (active work)
 * - Ready for Pickup: purple (waiting on customer)
 * - Completed: green (done)
 * - Cancelled: gray (inactive)
 */

import { View, Text, StyleSheet } from "react-native";
import { AlterationStatus } from "@/types";

// Status → display label and color mapping.
// Exported so other alteration components can reuse these colors.
export const ALTERATION_STATUS_CONFIG: Record<
  AlterationStatus,
  { label: string; bg: string; text: string }
> = {
  [AlterationStatus.REQUESTED]: {
    label: "Requested",
    bg: "#dbeafe",
    text: "#3b82f6",
  },
  [AlterationStatus.IN_PROGRESS]: {
    label: "In Progress",
    bg: "#fef3c7",
    text: "#f59e0b",
  },
  [AlterationStatus.READY_FOR_PICKUP]: {
    label: "Ready for Pickup",
    bg: "#ede9fe",
    text: "#8b5cf6",
  },
  [AlterationStatus.COMPLETED]: {
    label: "Completed",
    bg: "#dcfce7",
    text: "#22c55e",
  },
  [AlterationStatus.CANCELLED]: {
    label: "Cancelled",
    bg: "#f3f4f6",
    text: "#6b7280",
  },
};

interface AlterationStatusBadgeProps {
  status: AlterationStatus;
}

export default function AlterationStatusBadge({
  status,
}: AlterationStatusBadgeProps) {
  const config = ALTERATION_STATUS_CONFIG[status];

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
