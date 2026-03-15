import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

/**
 * Configurator screen — placeholder for the multi-step product configurator.
 *
 * This screen receives a productId route param from the products catalog.
 * The full implementation (fabric selection, option steps, review summary)
 * will be built in upcoming steps.
 */
export default function ConfiguratorScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurator</Text>
      <Text style={styles.subtitle}>Product ID: {productId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
});
