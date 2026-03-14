import { supabase } from "../../lib/supabase";
import { Fabric, SavedFabric } from "../../types";

/**
 * Catalog API — all Supabase queries for fabric browsing live here.
 *
 * WHY A SEPARATE API FILE (SAME PATTERN AS AUTH):
 * Components never call Supabase directly. This keeps the data layer
 * testable and swappable. React Query hooks in hooks.ts wrap these
 * functions with caching, loading states, and error handling.
 *
 * WHY WE THROW ON ERROR:
 * Supabase returns { data, error } instead of throwing. We convert to
 * thrown errors so React Query's built-in error handling works naturally
 * (useQuery exposes an `error` property that the UI can render directly).
 */

/**
 * Filter options for the fabric catalog query.
 *
 * WHY OPTIONAL FILTERS INSTEAD OF SEPARATE FUNCTIONS:
 * A single fetchFabrics with optional filters is more flexible than
 * fetchAvailableFabrics, fetchFabricsByColor, etc. The caller (hook)
 * passes whatever filters it needs, and the query builder chains them
 * conditionally. This avoids an explosion of nearly-identical functions.
 */
interface FabricFilters {
  /** When true, only return fabrics where available = true */
  availableOnly?: boolean;
  /** Filter by color tag — uses Postgres array containment (@>) */
  colorTag?: string;
}

/**
 * Fetch all fabrics with optional filtering.
 *
 * HOW THE QUERY BUILDS:
 * Supabase's query builder is chainable — .eq(), .contains(), etc.
 * return the same builder object, so we can conditionally append
 * filters without breaking the chain. The final await triggers the
 * actual HTTP request.
 *
 * WHY ORDER BY name:
 * Alphabetical ordering gives a stable, predictable list. Without an
 * explicit order, Postgres returns rows in an undefined order that can
 * change between queries (especially after vacuuming). This would cause
 * the FlatList to randomly reorder on refresh, which is jarring UX.
 */
export async function fetchFabrics(filters?: FabricFilters): Promise<Fabric[]> {
  let query = supabase
    .from("fabrics")
    .select("*")
    .order("name", { ascending: true });

  // Only show available fabrics by default in the customer-facing catalog.
  // The tailor sees all fabrics via the Supabase dashboard (service role).
  if (filters?.availableOnly) {
    query = query.eq("available", true);
  }

  // Postgres array containment: color_tags @> ARRAY['navy']
  // This returns any fabric whose color_tags array contains the given tag.
  if (filters?.colorTag) {
    query = query.contains("color_tags", [filters.colorTag]);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Fabric[];
}

/**
 * Fetch a single fabric by ID.
 *
 * WHY .single():
 * Supabase's .single() modifier tells PostgREST to expect exactly one row.
 * If zero or multiple rows match, it returns an error instead of silently
 * returning an empty array or the first match. This gives us a clear error
 * for the detail modal rather than a mysterious blank screen.
 */
export async function fetchFabricById(id: string): Promise<Fabric> {
  const { data, error } = await supabase
    .from("fabrics")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Fabric;
}

// ============================================================================
// SAVED FABRICS (Bookmarks)
//
// ARCHITECTURAL DECISION: Save/unsave operations are modeled as INSERT/DELETE
// on a junction table, not as updates to a flag column. This is the standard
// relational pattern for many-to-many relationships. The UNIQUE(user_id,
// fabric_id) constraint in Postgres prevents duplicate saves without the app
// needing to check first.
// ============================================================================

/**
 * Fetch all saved fabric records for the current user.
 *
 * WHY WE FETCH SavedFabric ROWS (NOT JOINED Fabric OBJECTS):
 * The catalog screen already has the full fabric list from useFabrics().
 * Fetching just the junction table rows (small, fast) gives us a list of
 * fabric_ids to match against. Joining the full fabric data here would
 * duplicate what React Query already has cached — wasteful bandwidth and
 * creates two sources of truth for fabric details.
 *
 * The component derives a Set<string> of saved fabric IDs from this data
 * for O(1) "is saved?" lookups per card.
 */
export async function fetchSavedFabrics(
  userId: string,
): Promise<SavedFabric[]> {
  const { data, error } = await supabase
    .from("saved_fabrics")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false }); // Most recently saved first

  if (error) throw error;
  return data as SavedFabric[];
}

/**
 * Save (bookmark) a fabric for the current user.
 *
 * WHY .select().single() AFTER INSERT:
 * By default, Supabase INSERT returns nothing (204 No Content). Adding
 * .select().single() tells PostgREST to return the created row, which we
 * need for optimistic update rollback — if the server call fails, we need
 * to know exactly what to remove from the cache.
 */
export async function saveFabric(
  userId: string,
  fabricId: string,
): Promise<SavedFabric> {
  const { data, error } = await supabase
    .from("saved_fabrics")
    .insert({ user_id: userId, fabric_id: fabricId })
    .select()
    .single();

  if (error) throw error;
  return data as SavedFabric;
}

/**
 * Unsave (remove bookmark) a fabric for the current user.
 *
 * WHY DELETE BY (user_id, fabric_id) INSTEAD OF BY id:
 * The component knows the user_id and fabric_id but not the junction table
 * row's id. We could fetch the id first, but that's an extra round-trip for
 * no benefit. The UNIQUE constraint guarantees at most one row matches this
 * pair, so the delete is precise.
 */
export async function unsaveFabric(
  userId: string,
  fabricId: string,
): Promise<void> {
  const { error } = await supabase
    .from("saved_fabrics")
    .delete()
    .eq("user_id", userId)
    .eq("fabric_id", fabricId);

  if (error) throw error;
}
