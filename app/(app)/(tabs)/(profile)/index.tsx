import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSignOut } from "@/features/auth/hooks";
import { useSession } from "@/hooks/useSession";
import { useOrders } from "@/features/orders/hooks";
import OrderRow from "@/features/orders/components/OrderRow";
import { Order } from "@/types";

/**
 * Profile screen — account dashboard for authenticated customers.
 *
 * Created as part of #20 to separate account management from the Home
 * storefront. This screen consolidates: user profile header, recent orders,
 * quick links (saved fabrics, measurements), and sign out.
 *
 * WHY SEPARATE FROM HOME:
 * The most valuable screen in a commerce app is the landing page. Using it
 * as an account dashboard wastes the opportunity to inspire browsing. Every
 * successful retail app (ASOS, Nike, Zara) uses the home screen for editorial
 * content and relegates account management to a dedicated profile section.
 */

/** Maximum orders to show before "View All" link */
const PROFILE_ORDER_LIMIT = 5;

export default function ProfileScreen() {
  const { mutate: logout, isPending } = useSignOut();
  const router = useRouter();
  const { session } = useSession();

  const { data: orders, isLoading: ordersLoading } = useOrders(
    session?.user.id,
  );

  const recentOrders = orders?.slice(0, PROFILE_ORDER_LIMIT) ?? [];
  const hasMoreOrders = (orders?.length ?? 0) > PROFILE_ORDER_LIMIT;

  // Extract user display info from session metadata.
  // full_name may be missing for older accounts or profiles updated via
  // the Supabase dashboard — fall back to email so the header isn't blank.
  const fullName =
    session?.user.user_metadata?.full_name || session?.user.email || "";
  const email = session?.user.email || "";

  // Avatar initial: first letter of name, fallback to first letter of email
  const avatarInitial = (fullName?.[0] || email?.[0] || "?").toUpperCase();

  const handleOrderPress = (order: Order) => {
    router.push(`/order-detail?orderId=${order.id}`);
  };

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Profile Header — avatar, name, and email */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar} testID="profile-avatar">
          <Text style={styles.avatarText} testID="profile-avatar-initial">
            {avatarInitial}
          </Text>
        </View>
        <Text style={styles.userName}>{fullName}</Text>
        <Text style={styles.userEmail}>{email}</Text>
      </View>

      {/* Quick Links — navigate to account-related screens */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>

        <Pressable
          style={styles.linkRow}
          onPress={() => router.push("/saved-fabrics")}
        >
          <Text style={styles.linkText}>Saved Fabrics</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {/* My Measurements — disabled placeholder until guided measurements
            feature (#23) is implemented. Shows "Coming Soon" label to signal
            future capability without creating a dead-end navigation. */}
        <View style={styles.linkRow}>
          <Text style={styles.linkTextDisabled}>My Measurements</Text>
          <Text style={styles.comingSoon}>Coming Soon</Text>
        </View>
      </View>

      {/* My Orders Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>My Orders</Text>

        {ordersLoading ? (
          <ActivityIndicator
            testID="orders-loading"
            size="small"
            color="#4f46e5"
            style={styles.loader}
          />
        ) : recentOrders.length === 0 ? (
          <Text style={styles.emptyText}>
            No orders yet. Browse our products to get started.
          </Text>
        ) : (
          <View>
            {recentOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onPress={handleOrderPress}
              />
            ))}

            {hasMoreOrders && (
              <Pressable
                style={styles.viewAllLink}
                onPress={() => router.push("/orders")}
                accessibilityRole="button"
                accessibilityLabel="View All Orders"
              >
                <Text style={styles.viewAllText}>View All Orders</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Sign Out */}
      <Pressable
        style={[styles.signOutButton, isPending && styles.buttonDisabled]}
        onPress={() => logout()}
        disabled={isPending}
      >
        <Text style={styles.signOutButtonText}>
          {isPending ? "Signing out..." : "Sign Out"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Profile header
  profileHeader: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  userEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },

  // Cards
  card: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },

  // Quick links
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  linkText: {
    fontSize: 16,
    color: "#111827",
  },
  linkTextDisabled: {
    fontSize: 16,
    color: "#9ca3af",
  },
  chevron: {
    fontSize: 20,
    color: "#9ca3af",
  },
  comingSoon: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },

  // Orders
  loader: {
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    paddingVertical: 20,
  },
  viewAllLink: {
    paddingVertical: 12,
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4f46e5",
  },

  // Sign out
  signOutButton: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signOutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
