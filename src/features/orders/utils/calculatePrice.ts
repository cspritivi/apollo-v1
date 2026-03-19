/**
 * Calculates total order price for a configured item.
 *
 * Formula: base_price + (fabric_price_per_meter × fabric_meters)
 *          + Σ(option.price_modifier)
 *
 * WHY A SHARED UTILITY (not inline in components):
 * This formula is used in three places: ReviewSummary (display), cart store
 * (snapshot at add-time), and order creation (final_price on insert). A single
 * source of truth prevents the displayed price from drifting from the stored
 * price. The formula is simple now but the architecture supports adding tax,
 * discounts, or dynamic fabric yardage without changing callers.
 *
 * WHY INTEGER ARITHMETIC:
 * All prices are stored as whole integers (cents). Floating-point math causes
 * precision bugs in JavaScript (0.1 + 0.2 !== 0.3). The only float operation
 * is fabric_meters multiplication, which is rounded at the end to ensure the
 * result is always an integer.
 *
 * @param basePrice - Product base price in cents (integer)
 * @param fabricPricePerMeter - Fabric cost per meter in cents (integer)
 * @param fabricMeters - How many meters of fabric this product requires (may be decimal)
 * @param selectedOptions - Map of option_group → ProductOption with price_modifier
 * @returns Total price in cents, rounded to nearest integer
 */
import { ProductOption } from "../../../types";

export function calculatePrice(
  basePrice: number,
  fabricPricePerMeter: number,
  fabricMeters: number,
  selectedOptions: Record<string, ProductOption>,
): number {
  const fabricCost = fabricPricePerMeter * fabricMeters;

  const optionModifiers = Object.values(selectedOptions).reduce(
    (sum, opt) => sum + opt.price_modifier,
    0,
  );

  // Round to nearest integer to eliminate floating-point drift from
  // fabric_meters multiplication (e.g., 3333 * 1.7 = 5666.1)
  return Math.round(basePrice + fabricCost + optionModifiers);
}
