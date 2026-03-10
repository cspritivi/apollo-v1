import { useQuery } from "@tanstack/react-query";
import { fetchFabrics, fetchFabricById } from "./api";

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
