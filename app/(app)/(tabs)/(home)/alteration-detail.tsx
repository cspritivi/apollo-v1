/**
 * Alteration Detail Screen — shows full information about an alteration request.
 *
 * Accessed by tapping an AlterationRow from the order detail screen.
 * Uses `useAlteration(alterationId)` to fetch the single alteration.
 *
 * DISPLAYS:
 * - Status badge (prominent, at the top)
 * - Description of the alteration
 * - Charge amount (if set by the tailor, otherwise "Pending quote")
 * - Customer notes (if any)
 * - Timestamps: requested date, last updated, completed date (if applicable)
 *
 * WHY NOT REUSE ORDER DETAIL SCREEN:
 * Alterations have fundamentally different data (no chosen_options, no timeline
 * of status transitions, different fields). A separate screen is cleaner than
 * conditionally rendering order vs alteration content in one screen.
 */

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAlteration } from "@/features/alterations/hooks";
import AlterationStatusBadge from "@/features/alterations/components/AlterationStatusBadge";
import { formatDate } from "@/features/orders/utils/formatDate";
import { AlterationStatus } from "@/types";

export default function AlterationDetailScreen() {
  const { alterationId } = useLocalSearchParams<{ alterationId: string }>();
  const { data: alteration, isLoading, error } = useAlteration(alterationId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading alteration...</Text>
      </View>
    );
  }

  if (error || !alteration) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error
            ? "Failed to load alteration. Please try again."
            : "Alteration not found."}
        </Text>
      </View>
    );
  }

  // Format charge from cents to display string, or show pending if zero
  const chargeDisplay =
    alteration.charge_amount > 0
      ? `$${(alteration.charge_amount / 100).toFixed(2)}`
      : "Pending quote";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header — status badge and request date */}
      <View style={styles.header}>
        <AlterationStatusBadge status={alteration.status} />
        <Text style={styles.date}>
          Requested {formatDate(alteration.created_at)}
        </Text>
      </View>

      {/* Description Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alteration Details</Text>
        <Text style={styles.description}>{alteration.description}</Text>
      </View>

      {/* Info Card — charge and timestamps */}
      <View style={styles.card}>
        {/* Charge amount */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Charge</Text>
          <Text
            style={[
              styles.detailValue,
              alteration.charge_amount === 0 && styles.pendingText,
            ]}
          >
            {chargeDisplay}
          </Text>
        </View>

        {/* Last updated */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Last Updated</Text>
          <Text style={styles.detailValue}>
            {formatDate(alteration.updated_at)}
          </Text>
        </View>

        {/* Completed date — only shown when alteration is complete */}
        {alteration.completed_at && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Completed</Text>
            <Text style={styles.detailValue}>
              {formatDate(alteration.completed_at)}
            </Text>
          </View>
        )}
      </View>

      {/* Customer notes — only shown when present */}
      {alteration.customer_notes && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Notes</Text>
          <Text style={styles.notesText}>{alteration.customer_notes}</Text>
        </View>
      )}

      {/* Status-specific guidance message */}
      <View style={styles.guidanceContainer}>
        <Text style={styles.guidanceText}>
          {getGuidanceMessage(alteration.status)}
        </Text>
      </View>

      {/* Reference ID */}
      <Text style={styles.reference}>
        Ref: {alteration.id.slice(0, 8).toUpperCase()}
      </Text>
    </ScrollView>
  );
}

/**
 * Status-specific guidance helps the customer understand what happens next.
 * This removes ambiguity — instead of just seeing "In Progress", the customer
 * knows what action (if any) is needed from them.
 */
function getGuidanceMessage(status: AlterationStatus): string {
  switch (status) {
    case AlterationStatus.REQUESTED:
      return "Your request has been submitted. The tailor will review it and provide a quote.";
    case AlterationStatus.IN_PROGRESS:
      return "The tailor is working on your alteration. You'll be notified when it's ready.";
    case AlterationStatus.READY_FOR_PICKUP:
      return "Your alteration is complete and ready for pickup at the shop.";
    case AlterationStatus.COMPLETED:
      return "This alteration has been completed. Thank you!";
    case AlterationStatus.CANCELLED:
      return "This alteration request was cancelled.";
  }
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  date: {
    fontSize: 13,
    color: "#9ca3af",
  },

  // Cards — reusing order detail card styles for consistency
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
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
  pendingText: {
    color: "#f59e0b",
    fontStyle: "italic",
  },

  // Notes
  notesText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },

  // Guidance
  guidanceContainer: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  guidanceText: {
    fontSize: 13,
    color: "#3b82f6",
    lineHeight: 18,
  },

  // Reference
  reference: {
    textAlign: "center",
    fontSize: 12,
    color: "#d1d5db",
    marginTop: 8,
  },
});
