/**
 * React Query hooks for alteration operations.
 *
 * These wrap the API functions in api.ts with caching, error handling,
 * and cache invalidation. Components use these hooks — never the API
 * functions directly.
 *
 * WHY SEPARATE QUERY KEYS ("by-order" vs "by-profile"):
 * Alterations can be queried two ways: all for an order (order detail screen)
 * or all for a customer (overview screen). Each needs its own cache key so
 * React Query can invalidate them independently. Creating a new alteration
 * invalidates both — the order's list and the customer's global list.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAlteration,
  fetchAlterationsByOrder,
  fetchAlterationsByProfile,
  fetchAlterationById,
  CreateAlterationInput,
} from "@/features/alterations/api";

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all alterations for a specific order. Used on the order detail
 * screen to show alteration history beneath the order timeline.
 *
 * staleTime is 2 minutes — alteration status changes are infrequent
 * (tailor updates via dashboard) but should reflect reasonably quickly.
 */
export function useAlterationsByOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ["alterations", "by-order", orderId],
    queryFn: () => fetchAlterationsByOrder(orderId!),
    enabled: !!orderId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch all alterations across all orders for a customer.
 * Used for a "My Alterations" overview section.
 */
export function useAlterationsByProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: ["alterations", "by-profile", profileId],
    queryFn: () => fetchAlterationsByProfile(profileId!),
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch a single alteration by ID for the detail screen.
 */
export function useAlteration(alterationId: string | undefined) {
  return useQuery({
    queryKey: ["alterations", "detail", alterationId],
    queryFn: () => fetchAlterationById(alterationId!),
    enabled: !!alterationId,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new alteration request.
 *
 * On success: invalidates both the order-specific and profile-wide
 * alteration caches so both screens show the new request immediately.
 *
 * WHY INVALIDATE TWO CACHE KEYS:
 * The alteration appears on two different screens — the order detail
 * ("alterations for this order") and the customer overview ("all my
 * alterations"). Both caches must be refreshed.
 *
 * On error: the mutation's `error` state is exposed to the component
 * for display. No state is cleared — the customer can retry.
 */
export function useCreateAlteration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAlterationInput) => createAlteration(input),
    onSuccess: (_data, variables) => {
      // Invalidate the order-specific alteration list
      queryClient.invalidateQueries({
        queryKey: ["alterations", "by-order", variables.orderId],
      });

      // Invalidate the profile-wide alteration list
      queryClient.invalidateQueries({
        queryKey: ["alterations", "by-profile", variables.profileId],
      });
    },
  });
}
