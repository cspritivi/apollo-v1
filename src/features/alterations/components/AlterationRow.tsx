/**
 * AlterationRow — displays a single alteration in a list.
 *
 * Shows the description (truncated to one line), status badge, and date.
 * Always tappable — navigates to the alteration detail screen.
 *
 * ARCHITECTURAL DECISION: Navigation is wired at the screen level via the
 * onPress callback, not inside this component. This keeps AlterationRow a
 * pure presentational component (same pattern as OrderRow).
 */

import { View, Text, Pressable, StyleSheet } from "react-native";
import { Alteration } from "../../../types";
import AlterationStatusBadge from "./AlterationStatusBadge";
import { formatDate } from "../../orders/utils/formatDate";

interface AlterationRowProps {
  alteration: Alteration;
  onPress: (alteration: Alteration) => void;
}

export default function AlterationRow({
  alteration,
  onPress,
}: AlterationRowProps) {
  return (
    <Pressable
      testID="alteration-row"
      style={styles.row}
      onPress={() => onPress(alteration)}
      // Explicit accessibilityLabel so Maestro can find rows by status.
      // iOS groups Pressable children into one opaque string — this gives
      // a predictable format for regex matching.
      accessibilityLabel={`${alteration.description}, ${alteration.status}, ${formatDate(alteration.created_at)}`}
    >
      <View style={styles.info}>
        {/* Description truncated to one line — full text on detail screen */}
        <Text style={styles.description} numberOfLines={1}>
          {alteration.description}
        </Text>
        <Text style={styles.date}>{formatDate(alteration.created_at)}</Text>
      </View>
      <AlterationStatusBadge status={alteration.status} />
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 14,
    fontWeight: "500",
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
