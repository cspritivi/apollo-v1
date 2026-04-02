/**
 * Type declarations for environment variables.
 *
 * Expo exposes env vars prefixed with EXPO_PUBLIC_ to the client bundle.
 * Declaring them here gives us autocomplete and type safety when accessing
 * process.env — without this, TypeScript treats them as `string | undefined`
 * and we'd need null checks everywhere.
 *
 * IMPORTANT: Never put secret keys in EXPO_PUBLIC_ variables. These are
 * embedded in the client bundle and visible to anyone who decompiles the app.
 * The anon key is safe because RLS policies protect the data, not the key.
 */
declare module "@env" {
  export const EXPO_PUBLIC_SUPABASE_URL: string;
  export const EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  export const EXPO_PUBLIC_SUPPORT_WHATSAPP: string;
}
