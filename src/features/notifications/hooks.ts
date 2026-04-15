import { useMutation } from "@tanstack/react-query";
import {
  upsertPushToken,
  deletePushToken,
  UpsertPushTokenInput,
} from "@/features/notifications/api";

/**
 * React Query mutations for push token registration / cleanup.
 *
 * WHY MUTATIONS (not plain async calls):
 * Consistent with the rest of the app — mutations give free `isPending` /
 * `error` state and retry semantics. They also slot cleanly into the
 * orchestrator hook's `useEffect` dependency pattern.
 *
 * WHY NO CACHE INVALIDATION:
 * push_tokens is never read from the client. It's written on login, deleted
 * on logout, and otherwise only read server-side by the Edge Function.
 */

export function useUpsertPushToken() {
  return useMutation({
    mutationFn: (input: UpsertPushTokenInput) => upsertPushToken(input),
  });
}

export function useDeletePushToken() {
  return useMutation({
    mutationFn: (token: string) => deletePushToken(token),
  });
}
