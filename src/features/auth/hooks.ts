import { useMutation } from "@tanstack/react-query";
import { signIn, signUp, signOut } from "./api";

/**
 * Auth hooks — React Query mutations for auth operations.
 *
 * WHY USE REACT QUERY MUTATIONS FOR AUTH (NOT JUST PLAIN ASYNC CALLS):
 * React Query mutations give us:
 * - isPending: boolean to show loading spinners / disable buttons
 * - error: the error object to display in the UI
 * - reset(): clears the error state (useful for dismissing error messages)
 *
 * Without React Query, we'd need to manually manage loading and error state
 * with useState for every auth operation. That's 6 lines of boilerplate
 * per operation (loading state, error state, try/catch, set loading true,
 * set loading false, set error). Mutations eliminate all of that.
 *
 * WHY NO onSuccess CALLBACKS HERE:
 * We don't need to manually navigate on success. The auth flow is reactive:
 * Supabase auth state changes → onAuthStateChange fires → useSession()
 * updates → root layout redirects. The mutation just triggers the Supabase
 * call; the redirect happens automatically through the listener chain.
 *
 * INTERVIEW TALKING POINT:
 * "We use React Query mutations even for auth because they eliminate manual
 * loading/error state management. But unlike data-fetching queries, auth
 * mutations don't cache results — they're fire-and-forget. The actual
 * navigation is handled reactively through Supabase's auth state listener,
 * not imperatively in an onSuccess callback."
 */

/**
 * Mutation hook for signing up a new user.
 * Usage: const { mutate, isPending, error } = useSignUp();
 *        mutate({ email, password, fullName });
 */
export function useSignUp() {
  return useMutation({
    mutationFn: signUp,
  });
}

/**
 * Mutation hook for signing in an existing user.
 * Usage: const { mutate, isPending, error } = useSignIn();
 *        mutate({ email, password });
 */
export function useSignIn() {
  return useMutation({
    mutationFn: signIn,
  });
}

/**
 * Mutation hook for signing out the current user.
 * Usage: const { mutate, isPending } = useSignOut();
 *        mutate();
 */
export function useSignOut() {
  return useMutation({
    mutationFn: signOut,
  });
}
