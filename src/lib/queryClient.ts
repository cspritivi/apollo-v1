import { QueryClient } from "@tanstack/react-query";

/**
 * Shared QueryClient instance used by the QueryClientProvider in root layout.
 *
 * WHY A SEPARATE FILE:
 * The QueryClient is created once and shared across the app. Keeping it in
 * its own module (rather than inline in _layout.tsx) makes it importable
 * from tests or utilities that need to interact with the cache directly
 * (e.g., manually invalidating queries after a mutation).
 *
 * DEFAULT CONFIGURATION:
 * React Query's defaults are sensible for most cases:
 * - staleTime: 0 (data is immediately considered stale → refetched on mount)
 * - gcTime: 5 minutes (unused cache entries are garbage collected)
 * - retry: 3 (failed queries retry 3 times with exponential backoff)
 *
 * We'll tune staleTime per-query as needed (e.g., fabric catalog data
 * changes rarely, so it can have a longer staleTime). Global defaults
 * should be conservative.
 */
export const queryClient = new QueryClient();
