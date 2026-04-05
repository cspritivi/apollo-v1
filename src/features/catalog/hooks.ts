import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFabrics,
  fetchFabricById,
  fetchSavedFabrics,
  saveFabric,
  unsaveFabric,
  fetchProducts,
  fetchProductById,
  fetchProductOptions,
} from "@/features/catalog/api";
import { ProductOption, SavedFabric } from "@/types";

/**
 * Catalog hooks — React Query wrappers for fabric data fetching.
 *
 * WHY REACT QUERY FOR CATALOG DATA (NOT JUST fetch + useState):
 * React Query gives us caching, deduplication, background refetching,
 * and stale-while-revalidate out of the box. Without it, navigating
 * back to the catalog screen would re-fetch every time. With React Query,
 * cached data shows instantly while a background refetch updates silently.
 *
 * WHY useQuery (NOT useMutation LIKE AUTH):
 * Auth operations are imperative actions (sign in, sign out) — they change
 * state, so they're mutations. Catalog fetching is declarative data loading —
 * "give me the fabrics" — so it's a query. This distinction matters: queries
 * are automatically cached and refetched; mutations are fire-once.
 */

/**
 * Hook to fetch the fabric catalog with optional filtering.
 *
 * QUERY KEY DESIGN:
 * The key ["fabrics", filters] means React Query treats different filter
 * combinations as separate cache entries. Browsing "all fabrics" and then
 * filtering by "navy" creates two independent cache entries — switching
 * between them is instant after the first load.
 *
 * WHY staleTime IS 5 MINUTES:
 * Fabric catalog data changes infrequently (the tailor adds/updates fabrics
 * maybe once a week). A 5-minute staleTime means navigating back to the
 * catalog within 5 minutes won't trigger a network request at all — it
 * serves from cache immediately. After 5 minutes, it refetches in the
 * background (stale-while-revalidate). This balances freshness with
 * performance on mobile networks.
 */
export function useFabrics(filters?: {
  availableOnly?: boolean;
  colorTag?: string;
}) {
  return useQuery({
    queryKey: ["fabrics", filters],
    queryFn: () => fetchFabrics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes — catalog data changes rarely
  });
}

/**
 * Hook to fetch a single fabric by ID (for the detail modal).
 *
 * WHY `enabled: !!id`:
 * The detail modal may render before the user has tapped a fabric (id is
 * undefined). Setting enabled: false prevents React Query from firing a
 * request with an undefined ID, which would hit Supabase with an invalid
 * query. Once id is set, the query runs automatically.
 */
export function useFabric(id: string | undefined) {
  return useQuery({
    queryKey: ["fabrics", id],
    queryFn: () => fetchFabricById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// SAVED FABRICS HOOKS
//
// These introduce two new React Query concepts not used elsewhere in the app:
//
// 1. useMutation — for imperative write operations (save/unsave). Unlike
//    useQuery which fetches data declaratively, useMutation gives you a
//    mutate() function you call in response to user actions (button press).
//
// 2. Optimistic updates — updating the cache immediately BEFORE the server
//    responds, then rolling back if the server call fails. This makes the
//    UI feel instant even on slow networks. The pattern is:
//      onMutate: update cache optimistically → return rollback data
//      onError: use rollback data to restore previous cache state
//      onSettled: refetch from server to ensure cache matches reality
//
// INTERVIEW TALKING POINT:
// "We use optimistic updates for save/unsave because the operation is
// low-risk (worst case: the UI briefly shows a save that didn't persist)
// and high-frequency (users tap quickly through the catalog). Waiting for
// the server on every tap would feel sluggish, especially on mobile networks.
// For higher-risk operations like placing an order, we'd wait for server
// confirmation before updating the UI."
// ============================================================================

/**
 * Hook to fetch the current user's saved fabrics.
 *
 * WHY userId IN THE QUERY KEY:
 * Saved fabrics are user-specific. Including userId in the key ensures that
 * if the user logs out and a different user logs in, React Query treats them
 * as completely separate cache entries — no data leakage between accounts.
 *
 * WHY enabled: !!userId:
 * Before auth resolves, userId is undefined. This prevents an invalid query
 * from firing. Same pattern as useFabric(id) above.
 */
export function useSavedFabrics(userId: string | undefined) {
  return useQuery({
    queryKey: ["saved_fabrics", userId],
    queryFn: () => fetchSavedFabrics(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes — shorter than catalog because
    // saves change more frequently (user actively bookmarking)
  });
}

/**
 * Mutation hook to save (bookmark) a fabric.
 *
 * OPTIMISTIC UPDATE FLOW:
 * 1. onMutate: Immediately add a temporary SavedFabric to the cache so the
 *    heart icon fills instantly. Cancel any in-flight refetches to prevent
 *    them from overwriting our optimistic update.
 * 2. onError: If the server INSERT fails, roll back the cache to the
 *    snapshot we saved in onMutate. The heart icon reverts.
 * 3. onSettled: Whether success or failure, refetch from the server to
 *    ensure the cache reflects the true database state. This handles edge
 *    cases like the server succeeding but with different data than expected.
 */
export function useSaveFabric(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fabricId: string) => saveFabric(userId, fabricId),

    onMutate: async (fabricId: string) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic update.
      await queryClient.cancelQueries({ queryKey: ["saved_fabrics", userId] });

      // Snapshot the current cache for rollback on error.
      const previousSaved = queryClient.getQueryData<SavedFabric[]>([
        "saved_fabrics",
        userId,
      ]);

      // Optimistically add the new save to the cache.
      // We create a temporary object — the real id and created_at will come
      // from the server when onSettled triggers a refetch.
      queryClient.setQueryData<SavedFabric[]>(
        ["saved_fabrics", userId],
        (old) => [
          ...(old ?? []),
          {
            id: `temp-${fabricId}`,
            user_id: userId,
            fabric_id: fabricId,
            created_at: new Date().toISOString(),
          },
        ],
      );

      // Return the snapshot so onError can roll back.
      return { previousSaved };
    },

    onError: (_error, _fabricId, context) => {
      // Rollback: restore the cache to pre-optimistic state.
      if (context?.previousSaved) {
        queryClient.setQueryData(
          ["saved_fabrics", userId],
          context.previousSaved,
        );
      }
    },

    onSettled: () => {
      // Always refetch after mutation to sync cache with server truth.
      queryClient.invalidateQueries({ queryKey: ["saved_fabrics", userId] });
    },
  });
}

/**
 * Mutation hook to unsave (remove bookmark) a fabric.
 *
 * Same optimistic update pattern as useSaveFabric, but in reverse:
 * onMutate removes the row from the cache, onError restores it.
 */
export function useUnsaveFabric(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fabricId: string) => unsaveFabric(userId, fabricId),

    onMutate: async (fabricId: string) => {
      await queryClient.cancelQueries({ queryKey: ["saved_fabrics", userId] });

      const previousSaved = queryClient.getQueryData<SavedFabric[]>([
        "saved_fabrics",
        userId,
      ]);

      // Optimistically remove the save from the cache.
      queryClient.setQueryData<SavedFabric[]>(
        ["saved_fabrics", userId],
        (old) => (old ?? []).filter((s) => s.fabric_id !== fabricId),
      );

      return { previousSaved };
    },

    onError: (_error, _fabricId, context) => {
      if (context?.previousSaved) {
        queryClient.setQueryData(
          ["saved_fabrics", userId],
          context.previousSaved,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_fabrics", userId] });
    },
  });
}

// ============================================================================
// PRODUCT HOOKS
//
// Same patterns as the fabric hooks above: useQuery for declarative data
// loading, query keys that encode the parameters for proper cache separation,
// and staleTime tuned for how often the data changes.
// ============================================================================

/**
 * Hook to fetch all available products for the product catalog screen.
 *
 * WHY SAME staleTime AS FABRICS:
 * Products change as rarely as fabrics (the tailor adds new products
 * maybe once a month). 5 minutes keeps the catalog snappy on mobile
 * while still picking up changes within a single browsing session.
 */
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single product by ID.
 *
 * Used by the configurator to load the selected product's details,
 * including its option_groups array which determines the configurator steps.
 *
 * WHY enabled: !!id:
 * Same guard as useFabric — prevents firing a query with undefined ID
 * before the user has selected a product.
 */
export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => fetchProductById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch product options grouped by option_group.
 *
 * WHY productId (NOT optionGroups):
 * The API now filters by product_id FK, which is the structurally correct
 * way to scope options to a product. This eliminates the bug where shared
 * option_group names (e.g., "pocket_style") would return options from all
 * products. The hook still groups the results by option_group for the
 * configurator UI.
 *
 * WHY GROUP IN THE HOOK (NOT THE API):
 * The API returns a flat array of ProductOption sorted by option_group.
 * The hook transforms this into a Record<string, ProductOption[]> (a map
 * from group name to its options) because that's what the configurator
 * UI needs — each step renders one group's options. Keeping the API flat
 * and the hook grouped follows the pattern of "API returns raw data,
 * hooks shape it for the UI."
 *
 * WHY THE select TRANSFORM:
 * React Query's select option transforms the cached data without
 * re-fetching. The raw flat array stays in the cache (efficient storage),
 * and the grouped version is derived on read. If we grouped in the API,
 * we'd lose the ability to use the flat array elsewhere.
 */
export function useProductOptions(productId: string | undefined) {
  return useQuery({
    queryKey: ["product_options", productId],
    queryFn: () => fetchProductOptions(productId!),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    /**
     * Transform the flat array into a grouped map using reduce.
     *
     * Input:  [{ option_group: "collar_style", ... }, { option_group: "collar_style", ... }, { option_group: "cuff_style", ... }]
     * Output: { "collar_style": [opt1, opt2], "cuff_style": [opt3] }
     *
     * WHY reduce (NOT a for loop or lodash.groupBy):
     * reduce is the idiomatic functional approach for this transformation.
     * It processes each item once (O(n)) and builds the result in a single
     * pass. No external dependency needed for a one-liner grouping operation.
     */
    select: (data: ProductOption[]) =>
      data.reduce<Record<string, ProductOption[]>>((groups, option) => {
        const group = groups[option.option_group] ?? [];
        group.push(option);
        groups[option.option_group] = group;
        return groups;
      }, {}),
  });
}
