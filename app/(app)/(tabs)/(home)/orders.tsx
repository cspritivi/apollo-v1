/**
 * Orders List Screen — shows all orders for the customer.
 *
 * Accessed from the Home screen's "View All Orders" link when the customer
 * has more than 5 orders. Pushed onto the Home stack — back button pops
 * automatically back to the Home screen via React Navigation's stack behavior.
 */

import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "../../../../src/hooks/useSession";
import { useOrders } from "../../../../src/features/orders/hooks";
import OrderRow from "../../../../src/features/orders/components/OrderRow";
import { Order } from "../../../../src/types";

export default function OrdersListScreen() {
  const { session } = useSession();
  const router = useRouter();
  const { data: orders, isLoading } = useOrders(session?.user.id);

  // Navigation wired at the screen level — OrderRow is presentational
  const handleOrderPress = (order: Order) => {
    router.push(`/order-detail?orderId=${order.id}`);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No orders yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} onPress={handleOrderPress} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    paddingVertical: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
  },
  card: {
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
});
