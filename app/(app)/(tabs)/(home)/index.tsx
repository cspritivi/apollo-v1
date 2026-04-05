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
import RecentlyViewedRow from "@/components/RecentlyViewedRow";
import { RecentlyViewedItem } from "@/stores/recentlyViewedStore";

/**
 * Home screen — main dashboard for authenticated customers.
 *
 * Includes a "My Orders" section showing recent orders with status badges.
 * Tapping an order navigates to the order detail screen.
 */

/** Maximum orders to show on the home screen before "View All" link */
const HOME_ORDER_LIMIT = 5;

export default function HomeScreen() {
  const { mutate: logout, isPending } = useSignOut();
  const router = useRouter();
  const { session } = useSession();

  // Fetch orders for the logged-in customer
  const { data: orders, isLoading: ordersLoading } = useOrders(
    session?.user.id,
  );

  const recentOrders = orders?.slice(0, HOME_ORDER_LIMIT) ?? [];
  const hasMoreOrders = (orders?.length ?? 0) > HOME_ORDER_LIMIT;

  // Navigation wired at the screen level — OrderRow is presentational
  const handleOrderPress = (order: Order) => {
    router.push(`/order-detail?orderId=${order.id}`);
  };

  // Navigate to the appropriate screen when a recently viewed item is tapped
  const handleRecentlyViewedPress = (item: RecentlyViewedItem) => {
    if (item.type === "product") {
      router.push({
        pathname: "/(products)/configurator",
        params: { productId: item.id },
      } as any);
    } else {
      // For fabrics, navigate to the fabrics tab
      router.navigate("/(app)/fabrics" as any);
    }
  };

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        <View style={styles.headerButtons}>
          <Pressable
            style={styles.navButton}
            onPress={() => router.push("/saved-fabrics")}
          >
            <Text style={styles.navButtonText}>Saved Fabrics</Text>
          </Pressable>
          <Pressable
            style={[styles.signOutButton, isPending && styles.buttonDisabled]}
            onPress={() => logout()}
            disabled={isPending}
          >
            <Text style={styles.signOutButtonText}>
              {isPending ? "Signing out..." : "Sign Out"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Recently Viewed — shows items the customer has browsed for easy
          re-discovery. Only renders if there are recently viewed items. */}
      <RecentlyViewedRow onItemPress={handleRecentlyViewedPress} />

      {/* My Orders Section */}
      <View style={styles.ordersSection}>
        <Text style={styles.sectionTitle}>My Orders</Text>

        {ordersLoading ? (
          <ActivityIndicator
            size="small"
            color="#4f46e5"
            style={styles.loader}
          />
        ) : recentOrders.length === 0 ? (
          // Empty state
          <View style={styles.emptyOrders}>
            <Text style={styles.emptyText}>
              No orders yet. Start by browsing our products.
            </Text>
            <Pressable
              style={styles.browseLink}
              onPress={() => router.navigate("/(products)" as any)}
            >
              <Text style={styles.browseLinkText}>Browse Products</Text>
            </Pressable>
          </View>
        ) : (
          // Order list
          <View style={styles.orderList}>
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
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: "#4f46e5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  navButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  signOutButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signOutButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  // --- Orders section ---
  ordersSection: {
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
  loader: {
    paddingVertical: 20,
  },
  emptyOrders: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 12,
  },
  browseLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  browseLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4f46e5",
  },
  orderList: {
    // Container for order rows
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
});
