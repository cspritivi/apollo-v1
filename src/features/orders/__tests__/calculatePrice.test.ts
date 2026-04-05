/**
 * TDD tests for calculatePrice utility.
 *
 * The pricing formula is: base_price + (fabric.price_per_meter × product.fabric_meters)
 *                          + Σ(option.price_modifier)
 *
 * All values are integers (cents). This avoids floating-point precision bugs
 * that are common in e-commerce pricing (e.g., 0.1 + 0.2 !== 0.3).
 *
 * These tests were written BEFORE the implementation (TDD red phase).
 */

import { calculatePrice } from "../utils/calculatePrice";
import { ProductOption } from "@/types";

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Helper to create a minimal ProductOption with just the fields calculatePrice
 * cares about (price_modifier). Other fields are realistic but irrelevant.
 */
const makeOption = (
  group: string,
  modifier: number,
): [string, ProductOption] => [
  group,
  {
    id: `opt-${group}`,
    product_id: "prod-1",
    option_group: group,
    name: `${group} option`,
    description: null,
    image_url: null,
    price_modifier: modifier,
    available: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// ============================================================================
// TESTS
// ============================================================================

describe("calculatePrice", () => {
  it("returns base price when no fabric cost and no options", () => {
    // Simplest case: just the base product price
    const result = calculatePrice(5000, 0, 0, {});
    expect(result).toBe(5000);
  });

  it("adds fabric cost (price_per_meter × fabric_meters)", () => {
    // Base $50 + fabric ($25/m × 2.5m = $62.50) = $112.50
    const result = calculatePrice(5000, 2500, 2.5, {});
    expect(result).toBe(11250);
  });

  it("adds a single positive option modifier", () => {
    const options = Object.fromEntries([makeOption("cuff_style", 1500)]);
    // Base $50 + French Cuff +$15 = $65
    const result = calculatePrice(5000, 0, 0, options);
    expect(result).toBe(6500);
  });

  it("subtracts a single negative option modifier", () => {
    // Negative modifiers represent discounts (e.g., simpler construction)
    const options = Object.fromEntries([makeOption("pocket_style", -500)]);
    // Base $50 - $5 = $45
    const result = calculatePrice(5000, 0, 0, options);
    expect(result).toBe(4500);
  });

  it("calculates correctly with base + fabric + multiple mixed modifiers", () => {
    const options = Object.fromEntries([
      makeOption("cuff_style", 1500), // +$15
      makeOption("collar_style", 0), // +$0 (standard)
      makeOption("pocket_style", -500), // -$5
    ]);
    // Base $50 + fabric ($25/m × 2.5m = $62.50) + $15 - $5 = $122.50
    const result = calculatePrice(5000, 2500, 2.5, options);
    expect(result).toBe(12250);
  });

  it("handles suit fabric_meters (3.5m)", () => {
    // Suit: base $200 + fabric ($30/m × 3.5m = $105) = $305
    const result = calculatePrice(20000, 3000, 3.5, {});
    expect(result).toBe(30500);
  });

  it("handles trousers fabric_meters (1.8m)", () => {
    // Trousers: base $80 + fabric ($25/m × 1.8m = $45) = $125
    const result = calculatePrice(8000, 2500, 1.8, {});
    expect(result).toBe(12500);
  });

  it("returns base + modifiers when fabric price is zero", () => {
    const options = Object.fromEntries([makeOption("button_style", 2000)]);
    // Base $50 + fabric $0 + buttons +$20 = $70
    const result = calculatePrice(5000, 0, 2.5, options);
    expect(result).toBe(7000);
  });

  it("returns fabric + modifiers when base price is zero", () => {
    const options = Object.fromEntries([makeOption("lining", 1000)]);
    // Base $0 + fabric ($25/m × 2.5m = $62.50) + lining +$10 = $72.50
    const result = calculatePrice(0, 2500, 2.5, options);
    expect(result).toBe(7250);
  });

  it("returns base + fabric when all option modifiers are zero", () => {
    const options = Object.fromEntries([
      makeOption("collar_style", 0),
      makeOption("cuff_style", 0),
      makeOption("pocket_style", 0),
    ]);
    // Base $50 + fabric ($25/m × 2.5m = $62.50) + $0 = $112.50
    const result = calculatePrice(5000, 2500, 2.5, options);
    expect(result).toBe(11250);
  });

  it("rounds to nearest integer to avoid floating-point drift", () => {
    // 3333 * 1.7 = 5666.1 in floating point — must round to 5666
    const result = calculatePrice(0, 3333, 1.7, {});
    expect(result).toBe(Math.round(3333 * 1.7));
    expect(Number.isInteger(result)).toBe(true);
  });
});
