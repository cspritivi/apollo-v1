import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Supabase client — the single instance used across the entire app.
 *
 * WHY createClient() IS CALLED ONCE AT MODULE LEVEL:
 * The Supabase client maintains internal state (auth session, realtime
 * subscriptions, etc.). Creating multiple instances would cause auth
 * state to go out of sync. By exporting a singleton from this module,
 * every import gets the same instance. This is a common pattern called
 * the "module singleton" — Node/Metro module caching guarantees the
 * factory function runs only once.
 *
 * WHY WE PASS AsyncStorage:
 * By default, the Supabase JS client uses localStorage for persisting
 * the auth session (access token, refresh token). But React Native
 * doesn't have localStorage — it's a browser API. AsyncStorage is the
 * React Native equivalent. By passing it here, the auth session survives
 * app restarts (the user stays logged in).
 *
 * WHY detectSessionInUrl IS FALSE:
 * Supabase's default behavior is to check the URL for auth tokens (used
 * in browser-based OAuth redirects like "myapp.com/callback#access_token=...").
 * React Native doesn't use URLs for navigation in the same way, and checking
 * the URL would cause errors. Disabling this prevents those issues.
 *
 * SECURITY NOTE:
 * The anon key is NOT a secret — it's safe to embed in the client bundle.
 * All data protection comes from the RLS policies we set up in Supabase.
 * The anon key simply identifies which Supabase project to connect to and
 * grants the "anon" role, which RLS policies then restrict. Think of it
 * like an API base URL — public, but access is controlled server-side.
 *
 * INTERVIEW TALKING POINT:
 * "We use a module-level singleton for the Supabase client because it
 * maintains auth state internally. Multiple instances would cause session
 * conflicts. AsyncStorage replaces localStorage for React Native session
 * persistence, and detectSessionInUrl is disabled because RN doesn't use
 * browser-style URL redirects for auth."
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage to persist auth tokens across app restarts.
    // Without this, users would need to log in every time they open the app.
    storage: AsyncStorage,

    // Disable automatic URL parsing for auth tokens.
    // This is a browser-only feature that breaks in React Native.
    detectSessionInUrl: false,

    // Use PKCE (Proof Key for Code Exchange) flow for enhanced security.
    // PKCE prevents authorization code interception attacks, which is
    // especially important on mobile where deep links can be intercepted.
    flowType: "pkce",

    // Automatically refresh the access token before it expires.
    // Supabase tokens are short-lived (1 hour by default). This ensures
    // the user doesn't get logged out mid-session.
    autoRefreshToken: true,

    // Persist the session in AsyncStorage so it survives app restarts.
    persistSession: true,
  },
});
