import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Link } from "expo-router";
import { useSignIn } from "@/features/auth/hooks";

/**
 * Login Screen — email/password sign-in form.
 *
 * COMPONENT ARCHITECTURE:
 * - Form field values (email, password) are local component state (useState).
 *   These are ephemeral — they only matter while this screen is mounted.
 *   No reason to put them in Zustand or React Query.
 * - The sign-in operation uses a React Query mutation (useSignIn) which
 *   provides isPending and error states automatically.
 * - Navigation after successful login is NOT handled here. The root layout's
 *   auth listener detects the session change and redirects automatically.
 *   This screen doesn't even need to know where the user goes next.
 *
 * WHY KeyboardAvoidingView:
 * On iOS, the keyboard slides up and can cover input fields. KeyboardAvoidingView
 * adjusts the layout (via padding or position) so inputs stay visible. The
 * behavior differs by platform: iOS needs "padding", Android handles it
 * natively via android:windowSoftInputMode in AndroidManifest (which Expo
 * configures by default).
 *
 * WHY Alert.alert FOR ERRORS (FOR NOW):
 * This is a placeholder UX. In a production app, you'd show inline error
 * messages below the form fields. Alert.alert is quick to implement and
 * lets us focus on getting the auth flow working end-to-end before polishing.
 */
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // useSignIn returns a mutation object with:
  // - mutate(): triggers the sign-in
  // - isPending: true while the request is in flight
  // - error: the error object if sign-in failed
  const { mutate: login, isPending, error } = useSignIn();

  const handleLogin = () => {
    // Basic client-side validation before making the network call.
    // This avoids unnecessary API requests for obviously invalid input.
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    login(
      { email: email.trim(), password },
      {
        // onError runs if the mutation throws (which our api.ts does
        // when Supabase returns an error).
        onError: (err) => {
          Alert.alert("Login Failed", err.message);
        },
        // No onSuccess needed — the root layout handles navigation
        // reactively when the auth state changes.
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          // These props improve the email input UX:
          // - autoCapitalize: prevents first-letter capitalization
          // - keyboardType: shows @ and .com keys on mobile keyboards
          // - autoComplete: enables autofill from saved credentials
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          // secureTextEntry masks the input with dots.
          // autoComplete="password" enables password autofill from keychain.
          secureTextEntry
          autoComplete="password"
        />

        <Pressable
          style={[styles.button, isPending && styles.buttonDisabled]}
          onPress={handleLogin}
          // Disable the button while the request is in flight to prevent
          // double-taps from sending duplicate sign-in requests.
          disabled={isPending}
        >
          <Text style={styles.buttonText}>
            {isPending ? "Signing in..." : "Sign In"}
          </Text>
        </Pressable>

        {/* Link component from Expo Router — renders a Pressable that navigates
            to the sign-up screen. Using Link instead of router.push() gives us
            accessibility features (screen readers announce it as a link) and
            long-press previews on web. */}
        <Link href="/(auth)/sign-up" asChild>
          <Pressable style={styles.linkContainer}>
            <Text style={styles.linkText}>
              Don't have an account?{" "}
              <Text style={styles.linkTextBold}>Sign Up</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
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
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
  },
  button: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
    color: "#6b7280",
  },
  linkTextBold: {
    color: "#111827",
    fontWeight: "600",
  },
});
