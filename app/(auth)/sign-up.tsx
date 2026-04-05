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
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useSignUp } from "@/features/auth/hooks";

/**
 * Sign-Up Screen — creates a new account with email, password, and name.
 *
 * WHY ScrollView WRAPS THIS SCREEN:
 * The sign-up form has more fields than login. On smaller devices, the
 * keyboard can push content off-screen. ScrollView ensures all fields
 * remain accessible by scrolling, even with the keyboard open.
 *
 * WHY WE COLLECT fullName AT SIGN-UP:
 * The profiles table requires full_name (NOT NULL). By collecting it during
 * sign-up, we can pass it as metadata to Supabase Auth, and our database
 * trigger (Step 4) uses it to create a complete profile row immediately.
 * Without this, we'd need a separate "complete your profile" screen after
 * sign-up — worse UX and more code.
 */
export default function SignUpScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { mutate: register, isPending } = useSignUp();
  const router = useRouter();

  const handleSignUp = () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    // Client-side password confirmation check.
    // This catches typos before making a network request. The real
    // password strength validation happens server-side in Supabase
    // (configurable in Dashboard → Auth → Settings).
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    // Minimum password length check — matches Supabase's default minimum
    // of 6 characters. This prevents a round-trip to the server just to
    // get a "password too short" error.
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    register(
      {
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      },
      {
        onSuccess: () => {
          // When email confirmation is enabled, sign-up does NOT create a
          // session — the user must verify their email first. So the reactive
          // redirect (onAuthStateChange) won't fire. Instead, we show a
          // confirmation alert and navigate back to login manually.
          Alert.alert(
            "Sign Up Successful",
            "Please check your email and click the confirmation link to activate your account.",
            [{ text: "OK", onPress: () => router.replace("/(auth)/login") }],
          );
        },
        onError: (err) => {
          Alert.alert("Sign Up Failed", err.message);
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Sign up to get started with your tailor
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            // autoComplete="new-password" on both password fields tells the
            // OS password manager that this is a sign-up form, not a login.
            // It will offer to save the new password after successful sign-up.
            autoComplete="new-password"
          />

          <Pressable
            style={[styles.button, isPending && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={isPending}
          >
            <Text style={styles.buttonText}>
              {isPending ? "Creating account..." : "Create Account"}
            </Text>
          </Pressable>

          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.linkContainer}>
              <Text style={styles.linkText}>
                Already have an account?{" "}
                <Text style={styles.linkTextBold}>Sign In</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
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
