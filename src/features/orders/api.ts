/**
 * Orders API — all Supabase queries for order creation and retrieval.
 *
 * Components never call Supabase directly — they use React Query hooks
 * (in hooks.ts) that call these functions. This separation keeps the data
 * layer testable and replaceable.
 *
 * WHY CLIENT-SIDE UUIDs:
 * Each order's `id` is generated client-side before the insert. This provides
 * idempotency — if a network retry sends the same payload twice, the primary
 * key constraint prevents duplicate orders. Defense-in-depth alongside the
 * disabled submit button.
 */

import { supabase } from "../../lib/supabase";
import { Order, ProductOption } from "../../types";
import { calculatePrice } from "./utils/calculatePrice";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Payload for creating a single order. Contains everything needed to build
 * the order row — the API function handles UUID generation, status
 * initialization, and price calculation.
 */
export interface CreateOrderInput {
  profileId: string;
  productId: string;
  fabricId: string;
  chosenOptions: Record<string, ProductOption>;
  basePrice: number;
  fabricPricePerMeter: number;
  fabricMeters: number;
  customerNotes: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a complete order row from the input. This is shared between
 * single-item and batch order creation to ensure consistency.
 */
function buildOrderRow(input: CreateOrderInput) {
  return {
    // No `id` — Postgres generates it via gen_random_uuid() default.
    // Client-side UUID generation (crypto.randomUUID) isn't reliably
    // available in React Native. The disabled submit button prevents
    // double-taps; server-side UUID generation is sufficient for now.
    profile_id: input.profileId,
    product_id: input.productId,
    fabric_id: input.fabricId,
    chosen_options: input.chosenOptions,
    measurement_snapshot: null,
    current_status: "PLACED",
    status_history: [
      {
        status: "PLACED",
        timestamp: new Date().toISOString(),
        note: null,
      },
    ],
    final_price: calculatePrice(
      input.basePrice,
      input.fabricPricePerMeter,
      input.fabricMeters,
      input.chosenOptions,
    ),
    customer_notes: input.customerNotes || null,
    internal_notes: null,
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Create a single order (express checkout).
 * Returns the created order for display on the success screen.
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const row = buildOrderRow(input);

  const { data, error } = await supabase
    .from("orders")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data as Order;
}

/**
 * Create multiple orders in a single batch insert (cart checkout).
 *
 * WHY BATCH (not N individual inserts):
 * Checkout is a single customer action — all items succeed or all fail.
 * A single .insert([rows]) call is atomic: if one row fails, none are
 * committed. This prevents partial orders where 2 of 3 items are created
 * and the third fails, leaving the customer in a confusing state.
 * It's also a single network round trip instead of N.
 */
export async function createOrders(
  inputs: CreateOrderInput[],
): Promise<Order[]> {
  const rows = inputs.map(buildOrderRow);

  const { data, error } = await supabase.from("orders").insert(rows).select();

  if (error) throw error;
  return data as Order[];
}

/**
 * Fetch all orders for a customer, most recent first.
 * Used by the home screen "My Orders" section and the full orders list.
 */
export async function fetchOrders(profileId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Order[];
}

/**
 * Fetch a single order by ID. Used for future order detail view.
 */
export async function fetchOrderById(orderId: string): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) throw error;
  return data as Order;
}
