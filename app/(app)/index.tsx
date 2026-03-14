import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSignOut } from "../../src/features/auth/hooks";

/**
 * Home screen — main dashboard for authenticated customers.
 *
 * Provides navigation to key features (saved fabrics, etc.) and sign-out.
 * This will expand as more features are built (order tracking, measurements).
 */
export default function HomeScreen() {
  const { mutate: logout, isPending } = useSignOut();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>You are logged in!</Text>

      {/* WHY router.push (NOT router.navigate):
          push() adds the saved-fabrics screen to the navigation stack,
          so the user gets a back button to return here. navigate() would
          replace the current screen if it already exists in the stack,
          which could cause unexpected behavior with tab navigation. */}
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
  navButton: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 200,
    alignItems: "center",
  },
  navButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 200,
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
