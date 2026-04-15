import { supabase } from "@/lib/supabase";

/**
 * Supabase calls for the push_tokens table.
 *
 * SEPARATION OF CONCERNS:
 * Hooks (hooks.ts) wrap these in React Query mutations; React components
 * never reach into Supabase directly. This is the same pattern used by
 * every other feature (orders, alterations, catalog).
 */

export interface UpsertPushTokenInput {
  profileId: string;
  token: string;
  platform: "ios" | "android";
}

/**
 * Insert a token row if new, otherwise refresh ownership + last_seen_at.
 *
 * WHY onConflict="token" (NOT composite):
 * An Expo push token identifies a *device installation*. If the same device
 * logs in as user A then later as user B, we want ownership to move to B
 * (so pushes for A stop firing on that device, and pushes for B start).
 * Setting the conflict target to `token` reassigns profile_id in-place.
 * A composite (profile_id, token) would insert a second row and leak old
 * tokens to a dormant profile.
 *
 * WHY WE BUMP last_seen_at CLIENT-SIDE:
 * The DB default fires on INSERT but not on the UPDATE branch of an upsert
 * in all Supabase versions. Setting it explicitly here keeps the behaviour
 * consistent and lets a future reaper job prune stale tokens reliably.
 */
export async function upsertPushToken(input: UpsertPushTokenInput) {
  const { error } = await supabase.from("push_tokens").upsert(
    {
      profile_id: input.profileId,
      token: input.token,
      platform: input.platform,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );
  if (error) throw error;
}

/**
 * Remove a single token row. Called on sign-out so the device stops
 * receiving pushes for a user who is no longer logged in there.
 */
export async function deletePushToken(token: string) {
  const { error } = await supabase
    .from("push_tokens")
    .delete()
    .eq("token", token);
  if (error) throw error;
}
