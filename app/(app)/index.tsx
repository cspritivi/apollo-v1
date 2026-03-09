import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSignOut } from "../../src/features/auth/hooks";

/**
 * Home screen — placeholder with sign-out button for testing the auth flow.
 * This will eventually become the main dashboard / catalog entry point.
 */
export default function HomeScreen() {
  const { mutate: logout, isPending } = useSignOut();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>You are logged in!</Text>

      <Pressable
        style={[styles.button, isPending && styles.buttonDisabled]}
        onPress={() => logout()}
        disabled={isPending}
      >
        <Text style={styles.buttonText}>
          {isPending ? "Signing out..." : "Sign Out"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
