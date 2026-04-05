import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Custom hook that tracks the current Supabase auth session.
 *
 * WHY THIS HOOK EXISTS:
 * Multiple parts of the app need to know the auth state — the root layout
 * (to decide which route group to show), the profile screen (to display
 * user info), and any component that needs the user's ID. Rather than
 * duplicating the session-listening logic, we centralize it here.
 *
 * HOW IT WORKS:
 * 1. On mount, calls supabase.auth.getSession() to check for an existing
 *    session (e.g., user was previously logged in and session was persisted
 *    in AsyncStorage).
 * 2. Subscribes to onAuthStateChange to react to login/logout/token refresh
 *    events in real time.
 * 3. Returns { session, isLoading } — isLoading is true while we're checking
 *    AsyncStorage for a persisted session. This prevents a flash of the login
 *    screen before the session is restored.
 *
 * WHY NOT ZUSTAND FOR AUTH STATE?
 * Supabase already manages auth state internally and provides a listener.
 * Wrapping it in Zustand would add a redundant layer of state management.
 * We only use Zustand for state that Supabase doesn't own (cart, UI flags).
 * This aligns with our state management philosophy: server-owned state
 * stays with the server library.
 *
 * INTERVIEW TALKING POINT:
 * "We use a lightweight hook instead of a global store for auth state because
 * Supabase already manages the session lifecycle internally. Adding Zustand
 * would create two sources of truth for the same data. The hook simply
 * surfaces Supabase's internal state to React's rendering cycle."
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for an existing session persisted in AsyncStorage.
    // This runs once on mount and resolves the initial auth state.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Subscribe to auth state changes (login, logout, token refresh).
    // This keeps the session in sync for the lifetime of the component.
    // The subscription returns an object with an unsubscribe method that
    // we call on cleanup to prevent memory leaks.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, isLoading };
}
