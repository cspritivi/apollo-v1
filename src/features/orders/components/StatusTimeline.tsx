/**
 * StatusTimeline — vertical timeline showing an order's status history.
 *
 * Renders entries in reverse chronological order (newest first) so the
 * customer sees the latest update immediately without scrolling. The most
 * recent entry is visually highlighted with the status color and bold text;
 * past entries are muted gray.
 *
 * WHY NOT A FLATLIST:
 * Status history has at most 7 entries (one per OrderStatus). A simple .map()
 * avoids FlatList's virtualization overhead which only pays off for long lists.
 */

import { View, Text, StyleSheet } from "react-native";
import { StatusHistoryEntry, OrderStatus } from "../../../types";
import { STATUS_CONFIG } from "./StatusBadge";
import { formatDateTime } from "../utils/formatDate";

interface StatusTimelineProps {
  statusHistory: StatusHistoryEntry[];
}

export default function StatusTimeline({ statusHistory }: StatusTimelineProps) {
  // Reverse so newest entry appears first — the original array is chronological
  // (oldest first) as stored in the database. We slice() to avoid mutating the prop.
  const entries = [...statusHistory].reverse();

  return (
    <View style={styles.container}>
      {entries.map((entry, index) => {
        const isLatest = index === 0;
        const isLast = index === entries.length - 1;
        const config = STATUS_CONFIG[entry.status as OrderStatus];

        return (
          <View key={`${entry.status}-${entry.timestamp}`} style={styles.row}>
            {/* Left column: dot + connecting line */}
            <View style={styles.dotColumn}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isLatest ? config.text : "#d1d5db",
                    borderColor: isLatest ? config.bg : "#e5e7eb",
                  },
                ]}
              />
              {/* Connecting line between dots — hidden on the last (bottom) entry */}
              {!isLast && <View style={styles.line} />}
            </View>

            {/* Right column: label, timestamp, optional note */}
            <View style={styles.content}>
              <Text
                testID="timeline-label"
                style={[
                  styles.label,
                  {
                    fontWeight: isLatest ? "700" : "400",
                    color: isLatest ? config.text : "#6b7280",
                  },
                ]}
              >
                {config.label}
              </Text>
              <Text style={styles.timestamp}>
                {formatDateTime(entry.timestamp)}
              </Text>
              {entry.note && <Text style={styles.note}>{entry.note}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    minHeight: 48,
  },
  dotColumn: {
    width: 24,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 4,
  },
  // Thin vertical line connecting consecutive dots
  line: {
    width: 2,
    flex: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 2,
  },
  content: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
  },
  label: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  note: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 4,
  },
});
