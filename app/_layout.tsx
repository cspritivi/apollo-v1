import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useSession } from "@/hooks/useSession";
import { ActivityIndicator, View } from "react-native";
import { setNotificationHandler } from "@/lib/notifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/**
 * Configure foreground display behaviour at module scope (before the first
 * render). Setting this inside the component would leave a window where an
 * incoming cold-start push has no handler registered yet.
 */
setNotificationHandler();

/**
 * Root Layout — the top-level component that wraps every screen in the app.
 *
 * WHAT THIS FILE DOES:
 * This is the "auth gate" — the single checkpoint that decides whether the
 * user sees the login screens or the main app screens. Every navigation
 * request passes through this layout.
 *
 * HOW THE AUTH REDIRECT WORKS:
 * 1. useSession() checks for an active Supabase session
 * 2. useSegments() tells us which route group the user is currently in
 * 3. If the user has a session but is on an (auth) screen → redirect to (app)
 * 4. If the user has NO session but is on an (app) screen → redirect to (auth)
 *
 * WHY <Slot /> INSTEAD OF <Stack />:
 * <Slot /> renders whatever child route matches the current URL, without
 * adding any navigation UI (no header, no back button). Each route group
 * has its own _layout.tsx that defines its navigation style (Stack, Tabs, etc.).
 * The root layout's job is purely auth redirection, not navigation chrome.
 *
 * WHY THE LOADING STATE MATTERS:
 * On app launch, useSession() needs to check AsyncStorage for a persisted
 * session. This is async. Without the loading state, the user would briefly
 * see the login screen before being redirected to the app — a "flash of
 * unauthenticated content" (similar to FOUC in web development). The
 * ActivityIndicator prevents this jarring experience.
 *
 * INTERVIEW TALKING POINT:
 * "The root layout implements the redirect pattern for auth — a single
 * checkpoint that routes users to the correct screen group based on their
 * session state. This is declarative and centralized, unlike imperative
 * approaches where every screen checks auth individually."
 */
export default function RootLayout() {
  const { session, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  // Push lifecycle — registration, tap routing, token roll. No-ops until a
  // session is present; safe to call unconditionally (Rules of Hooks).
  usePushNotifications();

  useEffect(() => {
    // Don't redirect while we're still checking for a persisted session.
    if (isLoading) return;

    // Check which route group the user is currently in.
    // segments[0] will be "(auth)" or "(app)" based on the current route.
    const inAuthGroup = segments[0] === "(auth)";

    if (session && inAuthGroup) {
      // User is logged in but viewing a login/sign-up screen.
      // Redirect them to the main app.
      router.replace("/(app)");
    } else if (!session && !inAuthGroup) {
      // User is NOT logged in but trying to view a protected screen.
      // Redirect them to login.
      router.replace("/(auth)/login");
    }
  }, [session, isLoading, segments]);

  // Show a loading spinner while checking for a persisted session.
  // This prevents the "flash of login screen" on app startup.
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // QueryClientProvider makes React Query available to every screen.
  // It must wrap the entire app so any component can use useQuery/useMutation.
  // <Slot /> renders the matched child route inside the provider.
  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
