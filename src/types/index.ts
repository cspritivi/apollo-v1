/**
 * Core TypeScript types for the Tailor App
 *
 * These types mirror the Supabase database schema but are maintained separately
 * to provide type safety across the application. Any schema changes in Supabase
 * must be reflected here.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Order lifecycle states following a strict state machine pattern.
 *
 * ARCHITECTURAL DECISION: These states form a directed graph with specific
 * allowed transitions. At scale, these transitions should be validated
 * server-side (e.g., via Postgres check constraints or RLS policies) to
 * prevent invalid state changes like PLACED → DELIVERED.
 *
 * The ALTERATIONS state represents in-process alterations before final delivery,
 * while post-delivery alterations are tracked separately in the alterations table.
 */
export enum OrderStatus {
  PLACED = "PLACED",
  IN_PRODUCTION = "IN_PRODUCTION",
  READY_FOR_TRIAL = "READY_FOR_TRIAL",
  TRIAL_COMPLETE = "TRIAL_COMPLETE",
  ALTERATIONS = "ALTERATIONS",
  READY_FOR_DELIVERY = "READY_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
}

/**
 * Alteration request lifecycle states.
 *
 * ARCHITECTURAL DECISION: Alterations have their own status enum separate from
 * OrderStatus because the business logic and charge model are distinct.
 * Post-delivery alterations are chargeable services, not part of the original
 * order fulfillment.
 */
export enum AlterationStatus {
  REQUESTED = "REQUESTED",
  IN_PROGRESS = "IN_PROGRESS",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

/**
 * Measurement unit system for international customers.
 * Stored per measurement set to ensure consistency.
 */
export enum MeasurementUnit {
  INCHES = "INCHES",
  CENTIMETERS = "CENTIMETERS",
}

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

/**
 * Customer profile linked to Supabase Auth.
 *
 * The `id` field matches the Supabase Auth user UUID, creating a 1:1 relationship
 * between auth identity and customer profile. This eliminates the need for
 * separate foreign keys and simplifies RLS policies.
 */
export interface Profile {
  id: string; // Matches Supabase Auth user.id
  email: string;
  full_name: string;
  phone: string | null;
  preferred_unit: MeasurementUnit;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Customer body measurement set.
 *
 * ARCHITECTURAL DECISION: Customers can have multiple measurement sets
 * (e.g., "Current", "From 2023") to handle body changes over time.
 * The `label` field allows customers to distinguish between sets.
 *
 * CRITICAL: When an order is placed, the selected measurement set must be
 * snapshotted onto the order itself (see Order.measurement_snapshot).
 * This prevents historical orders from reflecting updated measurements.
 */
export interface Measurement {
  id: string;
  profile_id: string; // FK to profiles.id
  label: string; // e.g., "Current", "Summer 2023"
  unit: MeasurementUnit;

  // All measurements stored as numbers in the specified unit
  chest: number;
  waist: number;
  hips: number;
  shoulder_width: number;
  sleeve_length: number;
  shirt_length: number;
  inseam: number;
  outseam: number;
  thigh: number;
  neck: number;

  notes: string | null; // Customer or tailor notes
  created_at: string;
  updated_at: string;
}

/**
 * Fabric catalog entry.
 *
 * The `image_url` points to Supabase Storage. The `color_tags` array enables
 * multi-color fabric search (e.g., ["navy", "white"] for pinstripes).
 */
export interface Fabric {
  id: string;
  name: string;
  description: string | null;
  image_url: string; // Full URL from Supabase Storage
  price_per_meter: number; // Stored in smallest currency unit (e.g., cents)
  color_tags: string[]; // e.g., ["navy", "white", "pinstripe"]
  available: boolean; // Soft-delete flag; false = out of stock or discontinued
  created_at: string;
  updated_at: string;
}

/**
 * Product type definition (e.g., Suit, Shirt, Pants).
 *
 * ARCHITECTURAL DECISION: Products define which option_groups are configurable
 * (e.g., a Suit has option groups: lapel_style, button_count, vent_style).
 * This list is stored as an array of strings rather than a junction table
 * because the option groups are relatively stable and simpler to query as JSON.
 */
export interface Product {
  id: string;
  name: string; // e.g., "Three-Piece Suit", "Dress Shirt"
  description: string | null;
  base_price: number; // Stored in smallest currency unit
  image_url: string | null;
  option_groups: string[]; // e.g., ["collar_style", "cuff_style", "pocket_style"]
  available: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Configurable option within an option group.
 *
 * Example: For option_group "collar_style", options might be:
 * - { name: "Spread Collar", option_group: "collar_style", image_url: "..." }
 * - { name: "Button-Down", option_group: "collar_style", image_url: "..." }
 *
 * The `price_modifier` allows certain premium options to add cost
 * (e.g., mother-of-pearl buttons +$20).
 */
export interface ProductOption {
  id: string;
  option_group: string; // e.g., "collar_style", "lining_color"
  name: string; // e.g., "Spread Collar", "Navy Lining"
  description: string | null;
  image_url: string | null; // Visual reference for customer selection
  price_modifier: number; // Additional cost in smallest currency unit (can be 0)
  available: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Status history entry for order audit trail.
 *
 * ARCHITECTURAL DECISION: Stored as a JSONB array on the orders table rather
 * than a separate status_history table. This trades normalization for simpler
 * queries (no join needed) and atomic updates (status + history updated together).
 *
 * Tradeoff: Cannot efficiently query "all orders that entered TRIAL_COMPLETE
 * on date X" without scanning the JSONB array. Acceptable for this scale;
 * revisit if analytics become complex.
 */
export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string; // ISO 8601 timestamp
  note: string | null; // Optional context (e.g., "Customer requested rush delivery")
}

/**
 * Core order entity capturing the full bespoke item configuration.
 *
 * ARCHITECTURAL DECISIONS:
 *
 * 1. chosen_options is a JSON snapshot, not FKs to product_options:
 *    This ensures order immutability. If the tailor later renames "Spread Collar"
 *    to "Classic Spread", historical orders still show what the customer
 *    actually ordered at that time.
 *
 * 2. measurement_snapshot is a full copy of the Measurement object:
 *    Measurements change as customers gain/lose weight. Storing a snapshot
 *    ensures we always know the exact measurements used for this specific order.
 *
 * 3. status_history is an append-only array:
 *    Every status transition is recorded with timestamp and optional note,
 *    creating a complete audit trail. This is critical for customer transparency
 *    and dispute resolution.
 *
 * 4. Fabric and Product are still FK references, not snapshots:
 *    We assume fabric/product core identity (name, image) won't change so
 *    drastically that historical orders become confusing. Price is snapshotted
 *    via final_price field.
 */
export interface Order {
  id: string;
  profile_id: string; // FK to profiles.id
  product_id: string; // FK to products.id
  fabric_id: string; // FK to fabrics.id

  /**
   * Snapshot of selected options at time of order placement.
   * Structure: { option_group: ProductOption }
   * Example: { "collar_style": { id: "...", name: "Spread Collar", ... } }
   */
  chosen_options: Record<string, ProductOption>;

  /**
   * Full snapshot of customer measurements at time of order placement.
   * This decouples the order from future measurement updates.
   */
  measurement_snapshot: Measurement;

  current_status: OrderStatus;

  /**
   * Append-only history of all status transitions.
   * Ordered chronologically (oldest first).
   */
  status_history: StatusHistoryEntry[];

  /**
   * Final calculated price including base product price, fabric cost,
   * and any option price modifiers. Stored to prevent price drift if
   * catalog prices change later.
   */
  final_price: number; // Smallest currency unit

  customer_notes: string | null; // Special requests from customer
  internal_notes: string | null; // Tailor's private notes (not shown to customer)

  created_at: string; // Order placement timestamp
  updated_at: string; // Last modification timestamp
}

/**
 * Post-delivery alteration request.
 *
 * ARCHITECTURAL DECISION: Modeled as a separate table rather than reusing
 * the orders table with additional statuses. This separation is intentional:
 *
 * 1. Business logic differs: Alterations are chargeable services, orders are
 *    pre-paid (or invoiced separately). Mixing these would complicate pricing logic.
 *
 * 2. Data model differs: Alterations need description of changes, charge amount,
 *    and potentially images. Orders need full configuration snapshots. Separate
 *    tables keep each entity focused.
 *
 * 3. Lifecycle differs: An order transitions through a fixed pipeline. Alterations
 *    can be requested multiple times for the same original order, each tracked
 *    independently.
 *
 * Tradeoff: More complex queries if we want "full history of an order including
 * all alterations", but this is rare compared to the simplicity of separate concerns.
 */
export interface Alteration {
  id: string;
  order_id: string; // FK to orders.id - which original order is being altered
  profile_id: string; // FK to profiles.id (denormalized for easier querying)

  description: string; // What needs to be altered (e.g., "Take in waist by 1 inch")
  status: AlterationStatus;

  charge_amount: number; // Cost of alteration in smallest currency unit

  /**
   * Optional image URLs showing fit issues or requested changes.
   * Stored as array of Supabase Storage URLs.
   */
  image_urls: string[] | null;

  customer_notes: string | null;
  internal_notes: string | null; // Tailor's private notes

  created_at: string; // Alteration request timestamp
  updated_at: string;
  completed_at: string | null; // Timestamp when status changed to COMPLETED
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Represents the valid state transitions for the order state machine.
 * This could be used client-side for UI validation or server-side for
 * enforcing business rules.
 *
 * Example usage:
 * ```ts
 * const canTransition = (from: OrderStatus, to: OrderStatus): boolean => {
 *   return VALID_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
 * };
 * ```
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.IN_PRODUCTION],
  [OrderStatus.IN_PRODUCTION]: [OrderStatus.READY_FOR_TRIAL],
  [OrderStatus.READY_FOR_TRIAL]: [OrderStatus.TRIAL_COMPLETE],
  [OrderStatus.TRIAL_COMPLETE]: [
    OrderStatus.ALTERATIONS,
    OrderStatus.READY_FOR_DELIVERY,
  ],
  [OrderStatus.ALTERATIONS]: [OrderStatus.READY_FOR_DELIVERY],
  [OrderStatus.READY_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [], // Terminal state; post-delivery alterations use separate table
};

/**
 * Type guard to check if a string is a valid OrderStatus.
 * Useful for runtime validation of data from Supabase.
 */
export const isOrderStatus = (value: string): value is OrderStatus => {
  return Object.values(OrderStatus).includes(value as OrderStatus);
};

/**
 * Type guard to check if a string is a valid AlterationStatus.
 */
export const isAlterationStatus = (
  value: string,
): value is AlterationStatus => {
  return Object.values(AlterationStatus).includes(value as AlterationStatus);
};
