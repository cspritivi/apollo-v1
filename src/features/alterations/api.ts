/**
 * Alterations API — all Supabase queries for alteration requests.
 *
 * Components never call Supabase directly — they use React Query hooks
 * (in hooks.ts) that call these functions. This separation keeps the data
 * layer testable and replaceable.
 *
 * WHY SEPARATE FROM ORDERS API:
 * Alterations have distinct business logic (chargeable, repeatable per order,
 * different lifecycle). Co-locating them with orders would conflate two
 * different domains. The feature-based folder structure keeps everything
 * alteration-related in one place.
 */

import { supabase } from "../../lib/supabase";
import { Alteration, AlterationStatus } from "../../types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Payload for creating an alteration request. The API function handles
 * default values (status = REQUESTED, nulls for optional fields).
 *
 * charge_amount is in smallest currency unit (cents) to avoid floating-point
 * issues — same convention as orders.
 */
export interface CreateAlterationInput {
  orderId: string;
  profileId: string;
  description: string;
  chargeAmount: number;
  customerNotes?: string;
  imageUrls?: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build the alteration row from input. Maps camelCase input to snake_case
 * DB columns and sets sensible defaults for fields the customer doesn't
 * control (status, internal_notes, completed_at).
 */
function buildAlterationRow(input: CreateAlterationInput) {
  return {
    // No `id` — Postgres generates via gen_random_uuid() default.
    order_id: input.orderId,
    profile_id: input.profileId,
    description: input.description,
    status: AlterationStatus.REQUESTED,
    charge_amount: input.chargeAmount,
    image_urls: input.imageUrls ?? null,
    customer_notes: input.customerNotes || null,
    internal_notes: null, // Tailor adds these via Supabase dashboard
    completed_at: null, // Set when status transitions to COMPLETED
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Create a new alteration request on a delivered order.
 * Returns the created alteration for display on the confirmation screen.
 */
export async function createAlteration(
  input: CreateAlterationInput,
): Promise<Alteration> {
  const row = buildAlterationRow(input);

  const { data, error } = await supabase
    .from("alterations")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data as Alteration;
}

/**
 * Fetch all alterations for a specific order, newest first.
 * Used on the order detail screen to show alteration history.
 *
 * WHY ORDER BY created_at DESC:
 * Customers care most about their latest alteration request. Showing newest
 * first matches the mental model of "what's happening now with my order."
 */
export async function fetchAlterationsByOrder(
  orderId: string,
): Promise<Alteration[]> {
  const { data, error } = await supabase
    .from("alterations")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Alteration[];
}

/**
 * Fetch all alterations for a customer across all orders, newest first.
 * Used for a "My Alterations" overview screen.
 *
 * WHY DENORMALIZED profile_id:
 * The profile_id column on alterations is technically redundant (we could
 * join through orders), but it enables this single-table query without a
 * join. The tradeoff is a small amount of data duplication for significantly
 * simpler and faster queries.
 */
export async function fetchAlterationsByProfile(
  profileId: string,
): Promise<Alteration[]> {
  const { data, error } = await supabase
    .from("alterations")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Alteration[];
}

/**
 * Fetch a single alteration by ID for the detail screen.
 */
export async function fetchAlterationById(
  alterationId: string,
): Promise<Alteration> {
  const { data, error } = await supabase
    .from("alterations")
    .select("*")
    .eq("id", alterationId)
    .single();

  if (error) throw error;
  return data as Alteration;
}
