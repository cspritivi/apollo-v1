/**
 * React Query hooks for order operations.
 *
 * These wrap the API functions in api.ts with caching, error handling,
 * and cache invalidation. Components use these hooks — never the API
 * functions directly.
 *
 * WHY NO OPTIMISTIC UPDATES FOR ORDER CREATION:
 * Orders are financial transactions. The customer must know definitively
 * whether their order was placed. Showing success before server confirmation
 * risks confusion if the server is down or the request fails. Instead,
 * we show a loading/disabled state on buttons during the mutation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createOrder,
  createOrders,
  fetchOrders,
  fetchOrderById,
  CreateOrderInput,
} from "@/features/orders/api";

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all orders for a customer. Used by the home screen "My Orders"
 * section and the full orders list screen.
 *
 * staleTime is 2 minutes — orders change when the tailor updates status,
 * which is infrequent but should reflect within a few minutes.
 */
export function useOrders(profileId: string | undefined) {
  return useQuery({
    queryKey: ["orders", profileId],
    queryFn: () => fetchOrders(profileId!),
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch a single order by ID. Used for future order detail view.
 */
export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ["orders", "detail", orderId],
    queryFn: () => fetchOrderById(orderId!),
    enabled: !!orderId,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a single order (express checkout).
 *
 * On success: invalidates the orders cache so the home screen shows
 * the new order. The caller is responsible for clearing configurator
 * state and navigating to the success screen.
 *
 * On error: the mutation's `error` state is exposed to the component
 * for display. No state is cleared — the customer can retry.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: (_data, variables) => {
      // Invalidate order list so home screen picks up the new order
      queryClient.invalidateQueries({
        queryKey: ["orders", variables.profileId],
      });
    },
  });
}

/**
 * Create multiple orders in a batch (cart checkout).
 *
 * WHY BATCH INSERT:
 * All items succeed or all fail — matches the customer's mental model
 * of one checkout action. On failure, the cart is retained (caller's
 * responsibility to NOT clear the cart on error), and the customer
 * can retry immediately.
 */
export function useCreateOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inputs: CreateOrderInput[]) => createOrders(inputs),
    onSuccess: (_data, variables) => {
      // All items share the same profileId — invalidate once
      if (variables.length > 0) {
        queryClient.invalidateQueries({
          queryKey: ["orders", variables[0].profileId],
        });
      }
    },
  });
}
