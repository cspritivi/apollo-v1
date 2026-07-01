/**
 * Tests for buildHydratedConfig -- the pure helper that reconciles a
 * persisted ConfiguratorSnapshot against freshly-loaded catalog data.
 *
 * The helper owns ALL staleness logic: dropping options whose ids no
 * longer appear in the loaded `groupedOptions`, dropping unavailable
 * fabrics, clamping `currentStep`, and deciding whether the resulting
 * config is empty enough to throw away (return null) or worth restoring.
 */

import { buildHydratedConfig, HydratedConfig } from "../buildHydratedConfig";
import { Fabric, Product, ProductOption } from "@/types";
import { ConfiguratorSnapshot } from "@/stores/configuratorSnapshotStore";

// ============================================================================
// FIXTURES
// ============================================================================

const product: Product = {
  id: "prod-1",
  name: "Dress Shirt",
  description: null,
  base_price: 5000,
  image_url: null,
  option_groups: ["collar_style", "cuff_style", "pocket_style"],
  fabric_meters: 2.5,
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const collarSpread: ProductOption = {
  id: "opt-collar-spread",
  product_id: "prod-1",
  option_group: "collar_style",
  name: "Spread",
  description: null,
  image_url: null,
  price_modifier: 0,
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const cuffFrench: ProductOption = {
  id: "opt-cuff-french",
  product_id: "prod-1",
  option_group: "cuff_style",
  name: "French",
  description: null,
  image_url: null,
  price_modifier: 1500,
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const pocketChest: ProductOption = {
  id: "opt-pocket-chest",
  product_id: "prod-1",
  option_group: "pocket_style",
  name: "Chest",
  description: null,
  image_url: null,
  price_modifier: 0,
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const groupedOptions: Record<string, ProductOption[]> = {
  collar_style: [collarSpread],
  cuff_style: [cuffFrench],
  pocket_style: [pocketChest],
};

const availableFabric: Fabric = {
  id: "fab-1",
  name: "White Cotton",
  description: null,
  image_url: "https://example.com/cotton.jpg",
  price_per_meter: 2500,
  color_tags: ["white"],
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const unavailableFabric: Fabric = { ...availableFabric, available: false };

const makeSnapshot = (
  overrides: Partial<ConfiguratorSnapshot> = {},
): ConfiguratorSnapshot => ({
  fabricId: "fab-1",
  selectedOptionIds: {
    collar_style: "opt-collar-spread",
    cuff_style: "opt-cuff-french",
  },
  currentStep: 2,
  customerNotes: "",
  savedAt: 1000,
  ...overrides,
});

// ============================================================================
// TESTS
// ============================================================================

describe("buildHydratedConfig", () => {
  describe("happy path", () => {
    it("returns a fully reconstructed config when everything is valid", () => {
      const result = buildHydratedConfig(
        makeSnapshot(),
        product,
        groupedOptions,
        availableFabric,
      );

      expect(result).not.toBeNull();
      const config = result as HydratedConfig;
      expect(config.product).toBe(product);
      expect(config.fabric).toBe(availableFabric);
      expect(config.selectedOptions.collar_style).toBe(collarSpread);
      expect(config.selectedOptions.cuff_style).toBe(cuffFrench);
      expect(config.currentStep).toBe(2);
      expect(config.customerNotes).toBe("");
    });

    it("preserves customer notes verbatim", () => {
      const result = buildHydratedConfig(
        makeSnapshot({ customerNotes: "  Please double-stitch the cuffs  " }),
        product,
        groupedOptions,
        availableFabric,
      );
      expect(result?.customerNotes).toBe("  Please double-stitch the cuffs  ");
    });
  });

  describe("stale option handling", () => {
    it("drops a selection whose option id no longer exists for that group", () => {
      const result = buildHydratedConfig(
        makeSnapshot({
          selectedOptionIds: {
            collar_style: "opt-collar-spread", // valid
            cuff_style: "opt-cuff-removed", // stale
          },
        }),
        product,
        groupedOptions,
        availableFabric,
      );

      expect(result).not.toBeNull();
      expect(result?.selectedOptions.collar_style).toBe(collarSpread);
      expect(result?.selectedOptions.cuff_style).toBeUndefined();
    });

    it("drops selections for option_groups that are no longer on the product", () => {
      const groupRemoved: Record<string, ProductOption[]> = {
        collar_style: [collarSpread],
        // cuff_style group missing entirely
        pocket_style: [pocketChest],
      };
      const result = buildHydratedConfig(
        makeSnapshot({
          selectedOptionIds: {
            collar_style: "opt-collar-spread",
            cuff_style: "opt-cuff-french",
          },
        }),
        product,
        groupRemoved,
        availableFabric,
      );

      expect(result?.selectedOptions.collar_style).toBe(collarSpread);
      expect(result?.selectedOptions.cuff_style).toBeUndefined();
    });
  });

  describe("fabric handling", () => {
    it("drops the fabric when it is unavailable", () => {
      const result = buildHydratedConfig(
        makeSnapshot(),
        product,
        groupedOptions,
        unavailableFabric,
      );
      expect(result).not.toBeNull();
      expect(result?.fabric).toBeNull();
      expect(result?.selectedOptions.collar_style).toBe(collarSpread);
    });

    it("treats undefined fabric as null in the result", () => {
      const result = buildHydratedConfig(
        makeSnapshot(),
        product,
        groupedOptions,
        undefined,
      );
      expect(result?.fabric).toBeNull();
    });

    it("treats explicit null fabric as null in the result", () => {
      const result = buildHydratedConfig(
        makeSnapshot({ fabricId: null }),
        product,
        groupedOptions,
        null,
      );
      expect(result?.fabric).toBeNull();
    });
  });

  describe("currentStep clamping", () => {
    it("clamps currentStep above the valid range to the last index", () => {
      // totalSteps = 1 fabric + 3 option groups + 1 review = 5; max index 4.
      const result = buildHydratedConfig(
        makeSnapshot({ currentStep: 99 }),
        product,
        groupedOptions,
        availableFabric,
      );
      expect(result?.currentStep).toBe(4);
    });

    it("clamps a negative currentStep to 0", () => {
      const result = buildHydratedConfig(
        makeSnapshot({ currentStep: -3 }),
        product,
        groupedOptions,
        availableFabric,
      );
      expect(result?.currentStep).toBe(0);
    });

    it("clamps after option_groups shrink (the last index moves down)", () => {
      const smallerProduct: Product = {
        ...product,
        option_groups: ["collar_style"], // total = 1 + 1 + 1 = 3; max index 2
      };
      const result = buildHydratedConfig(
        makeSnapshot({ currentStep: 4 }),
        smallerProduct,
        { collar_style: [collarSpread] },
        availableFabric,
      );
      expect(result?.currentStep).toBe(2);
    });
  });

  describe("non-empty rule", () => {
    it("preserves a notes-only draft (no fabric, no valid options)", () => {
      const result = buildHydratedConfig(
        makeSnapshot({
          fabricId: null,
          selectedOptionIds: {},
          customerNotes: "Special request: monogram on left cuff",
        }),
        product,
        groupedOptions,
        null,
      );
      expect(result).not.toBeNull();
      expect(result?.fabric).toBeNull();
      expect(Object.keys(result!.selectedOptions)).toHaveLength(0);
      expect(result?.customerNotes).toBe(
        "Special request: monogram on left cuff",
      );
    });

    it("returns null when everything has been invalidated and notes are empty", () => {
      const result = buildHydratedConfig(
        makeSnapshot({
          fabricId: "fab-1",
          selectedOptionIds: { collar_style: "opt-removed" },
          customerNotes: "",
        }),
        product,
        groupedOptions,
        unavailableFabric, // dropped
      );
      expect(result).toBeNull();
    });

    it("returns null when only whitespace notes remain", () => {
      const result = buildHydratedConfig(
        makeSnapshot({
          fabricId: null,
          selectedOptionIds: {},
          customerNotes: "   \t\n  ",
        }),
        product,
        groupedOptions,
        null,
      );
      expect(result).toBeNull();
    });

    it("preserves a draft with at least one valid option even with no fabric or notes", () => {
      const result = buildHydratedConfig(
        makeSnapshot({
          fabricId: null,
          selectedOptionIds: { collar_style: "opt-collar-spread" },
          customerNotes: "",
        }),
        product,
        groupedOptions,
        null,
      );
      expect(result).not.toBeNull();
      expect(result?.selectedOptions.collar_style).toBe(collarSpread);
    });
  });
});
