import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

/**
 * QuickActions — row of prominent CTA buttons on the Home storefront.
 *
 * Provides quick navigation to the most important app sections. Styled
 * as cards rather than plain links to make them visually prominent and
 * tappable on the landing page.
 *
 * WHY HARDCODED ACTIONS:
 * These CTAs are core business actions that rarely change. Hardcoding
 * them avoids unnecessary complexity. If the actions need to be dynamic
 * (e.g., driven by a CMS), this component can accept an actions array
 * prop instead.
 */

export default function QuickActions() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.action}
        onPress={() => router.navigate("/(products)" as never)}
      >
        <Ionicons name="shirt-outline" size={24} color="#4f46e5" />
        <Text style={styles.actionText}>Browse Products</Text>
      </Pressable>

      <Pressable
        style={styles.action}
        onPress={() => router.navigate("/(fabrics)" as never)}
      >
        <Ionicons name="color-palette-outline" size={24} color="#4f46e5" />
        <Text style={styles.actionText}>Browse Fabrics</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
  },
  action: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
});
