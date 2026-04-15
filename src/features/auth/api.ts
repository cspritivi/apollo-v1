import { supabase } from "@/lib/supabase";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { deletePushToken } from "@/features/notifications/api";

/**
 * Auth API — all Supabase auth calls live here.
 *
 * WHY A SEPARATE API FILE:
 * Components should never call Supabase directly. This separation means:
 * 1. We can test auth logic without rendering components
 * 2. If we ever swap Supabase for another auth provider, we change ONE file
 * 3. Components stay focused on UI, not network calls
 *
 * WHY WE THROW ERRORS INSTEAD OF RETURNING THEM:
 * Supabase returns errors as { data, error } objects rather than throwing.
 * We convert these to thrown errors so React Query's error handling works
 * naturally — mutations have onError callbacks, and the UI can show
 * error.message directly. This is a common adapter pattern when wrapping
 * libraries that don't throw.
 */

// --------------------------------------------------------------------------
// Types for auth function parameters
// --------------------------------------------------------------------------

interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
}

interface SignInParams {
  email: string;
  password: string;
}

// --------------------------------------------------------------------------
// Auth functions
// --------------------------------------------------------------------------

/**
 * Create a new account with email and password.
 *
 * HOW SIGN-UP WORKS WITH SUPABASE:
 * 1. supabase.auth.signUp() creates a user in auth.users
 * 2. We pass fullName in the `data` metadata field — this gets stored
 *    in auth.users.raw_user_meta_data (a JSONB column Supabase provides
 *    for custom fields during sign-up)
 * 3. A database trigger (Step 4) listens for new auth.users rows and
 *    auto-creates a matching profiles row using this metadata
 * 4. Supabase returns a session immediately (email confirmation can be
 *    configured in the Supabase dashboard if needed)
 *
 * WHY fullName IS PASSED AS METADATA, NOT INSERTED INTO PROFILES DIRECTLY:
 * At the moment of sign-up, the auth.users row doesn't exist yet, so we
 * can't insert into profiles (which has a FK to auth.users). The metadata
 * approach lets us piggyback the name on the auth creation, then a trigger
 * copies it to profiles atomically. No race condition, no second API call.
 */
export async function signUp({ email, password, fullName }: SignUpParams) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // This metadata is stored in auth.users.raw_user_meta_data
      // and is accessible in our database trigger to populate the profiles table.
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;

  // DUPLICATE EMAIL DETECTION:
  // When email confirmation is disabled, Supabase does NOT return an error
  // for duplicate sign-ups. Instead, it returns a user object with an empty
  // identities array. This is an intentional security measure to prevent
  // email enumeration (attackers can't probe which emails are registered).
  // We detect this case explicitly and throw a user-friendly error.
  if (data.user?.identities?.length === 0) {
    throw new Error("An account with this email already exists.");
  }

  return data;
}

/**
 * Sign in with email and password.
 *
 * HOW SIGN-IN WORKS:
 * 1. Supabase validates credentials against auth.users
 * 2. Returns a session object containing:
 *    - access_token (JWT, short-lived, ~1 hour)
 *    - refresh_token (long-lived, used to get new access tokens)
 *    - user object (id, email, metadata)
 * 3. The Supabase client automatically stores these in AsyncStorage
 * 4. onAuthStateChange fires, which triggers the redirect in root layout
 *
 * WHAT HAPPENS WITH THE TOKENS:
 * - access_token is sent in the Authorization header on every Supabase request
 * - When it expires, the client uses refresh_token to get a new one silently
 * - This is why autoRefreshToken: true is set in our Supabase client config
 * - The user never knows this is happening — they stay "logged in" seamlessly
 *
 * INTERVIEW TALKING POINT:
 * "The access token is a JWT that encodes the user's ID and role. Supabase's
 * PostgREST layer decodes it to set auth.uid() in RLS policies. So when our
 * policy says 'using (auth.uid() = profile_id)', Postgres is comparing the
 * user ID from the JWT against the row's profile_id. The token IS the
 * authorization mechanism."
 */
export async function signIn({ email, password }: SignInParams) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out the current user.
 *
 * This clears the session from both Supabase's internal state and
 * AsyncStorage. onAuthStateChange fires with a null session, which
 * triggers the redirect to the login screen in root layout.
 */
export async function signOut() {
  // Best-effort push token cleanup BEFORE clearing the auth session. Once
  // signOut completes, RLS blocks a later DELETE on push_tokens (the row is
  // owned by auth.uid() which is now null). Wrapped in try/catch so that
  // offline / 4xx / simulator conditions never block logout. The
  // authoritative prune is server-side (Edge Function removes dead tokens
  // on DeviceNotRegistered; future job will reap by last_seen_at).
  try {
    if (Device.isDevice) {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as
        | string
        | undefined;
      if (projectId) {
        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        if (token) await deletePushToken(token);
      }
    }
  } catch {
    // Swallow — logout must always succeed from the user's perspective.
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
