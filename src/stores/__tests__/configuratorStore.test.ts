/**
 * Configurator Store — TDD Tests
 *
 * These tests define the expected behavior of the configurator Zustand store
 * BEFORE the store is implemented. This is the "Red" phase of Red-Green-Refactor.
 *
 * WHY TDD FOR A ZUSTAND STORE:
 * The configurator store is a state machine that manages multi-step wizard
 * navigation and selection state. State machines are notoriously bug-prone
 * when edge cases aren't thought through upfront. Writing tests first forces
 * us to define exactly what "nextStep on the last option step" or "reset
 * after partial configuration" should do BEFORE we write the logic.
 *
 * WHY ZUSTAND IS EASY TO TEST:
 * Zustand stores are just functions that return state + actions. No React
 * rendering needed. We call actions directly and assert on the resulting
 * state. This is why Zustand is preferred over Context for testable state —
 * Context requires a React tree to test, Zustand doesn't.
 */

import { useConfiguratorStore } from "../configuratorStore";
import { Product, Fabric, ProductOption } from "../../types";

// ============================================================================
// TEST FIXTURES
//
// Realistic mock data matching the types in /src/types/index.ts.
// These simulate what the configurator would receive from React Query hooks.
// ============================================================================

const mockProduct: Product = {
  id: "prod-1",
  name: "Dress Shirt",
  description: "A classic dress shirt",
  base_price: 5000, // $50.00 in cents
  image_url: "https://example.com/shirt.jpg",
  option_groups: ["collar_style", "cuff_style", "pocket_style"],
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockFabric: Fabric = {
  id: "fab-1",
  name: "White Cotton",
  description: "Premium white cotton",
  image_url: "https://example.com/cotton.jpg",
  price_per_meter: 2500, // $25.00 per meter
  color_tags: ["white"],
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockCollarOption: ProductOption = {
  id: "opt-1",
  option_group: "collar_style",
  name: "Spread Collar",
  description: "A wide spread collar",
  image_url: "https://example.com/spread.jpg",
  price_modifier: 0,
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockCuffOption: ProductOption = {
  id: "opt-2",
  option_group: "cuff_style",
  name: "French Cuff",
  description: "Double-folded cuff with cufflinks",
  image_url: "https://example.com/french.jpg",
  price_modifier: 1500, // +$15.00
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockPocketOption: ProductOption = {
  id: "opt-3",
  option_group: "pocket_style",
  name: "Chest Pocket",
  description: "Single chest pocket",
  image_url: "https://example.com/pocket.jpg",
  price_modifier: 500, // +$5.00
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

// ============================================================================
// TESTS
// ============================================================================

/**
 * Reset the store to a clean state before each test.
 *
 * WHY THIS MATTERS:
 * Zustand stores are singletons — state persists across tests unless
 * explicitly reset. Without this, test order would matter (fragile tests).
 */
beforeEach(() => {
  useConfiguratorStore.getState().reset();
});

describe("configuratorStore", () => {
  // --------------------------------------------------------------------------
  // INITIAL STATE
  // --------------------------------------------------------------------------

  describe("initial state", () => {
    it("starts with no product selected", () => {
      const state = useConfiguratorStore.getState();
      expect(state.product).toBeNull();
    });

    it("starts with no fabric selected", () => {
      const state = useConfiguratorStore.getState();
      expect(state.fabric).toBeNull();
    });

    it("starts with empty selectedOptions", () => {
      const state = useConfiguratorStore.getState();
      expect(state.selectedOptions).toEqual({});
    });

    it("starts at step 0", () => {
      const state = useConfiguratorStore.getState();
      expect(state.currentStep).toBe(0);
    });

    it("starts with empty customerNotes", () => {
      const state = useConfiguratorStore.getState();
      expect(state.customerNotes).toBe("");
    });
  });

  // --------------------------------------------------------------------------
  // SET PRODUCT
  // --------------------------------------------------------------------------

  describe("setProduct", () => {
    it("sets the product", () => {
      useConfiguratorStore.getState().setProduct(mockProduct);
      expect(useConfiguratorStore.getState().product).toEqual(mockProduct);
    });

    it("resets all other state when a new product is set", () => {
      /**
       * WHY RESET ON PRODUCT CHANGE:
       * If the customer backs out and picks a different product, all previous
       * selections (fabric, options) are invalid — a shirt's collar options
       * don't apply to trousers. Resetting prevents stale state from leaking
       * across product configurations.
       */
      const { setProduct, setFabric, selectOption } =
        useConfiguratorStore.getState();

      // Build up some state first
      setProduct(mockProduct);
      setFabric(mockFabric);
      selectOption("collar_style", mockCollarOption);

      // Now set a different product
      const differentProduct: Product = {
        ...mockProduct,
        id: "prod-2",
        name: "Trousers",
        option_groups: ["fit_style", "pleat_style"],
      };
      useConfiguratorStore.getState().setProduct(differentProduct);

      const state = useConfiguratorStore.getState();
      expect(state.product).toEqual(differentProduct);
      expect(state.fabric).toBeNull();
      expect(state.selectedOptions).toEqual({});
      expect(state.currentStep).toBe(0);
      expect(state.customerNotes).toBe("");
    });
  });

  // --------------------------------------------------------------------------
  // SET FABRIC
  // --------------------------------------------------------------------------

  describe("setFabric", () => {
    it("sets the fabric", () => {
      useConfiguratorStore.getState().setFabric(mockFabric);
      expect(useConfiguratorStore.getState().fabric).toEqual(mockFabric);
    });

    it("can replace a previously selected fabric", () => {
      const otherFabric: Fabric = {
        ...mockFabric,
        id: "fab-2",
        name: "Blue Linen",
      };
      useConfiguratorStore.getState().setFabric(mockFabric);
      useConfiguratorStore.getState().setFabric(otherFabric);
      expect(useConfiguratorStore.getState().fabric).toEqual(otherFabric);
    });
  });

  // --------------------------------------------------------------------------
  // SELECT OPTION
  // --------------------------------------------------------------------------

  describe("selectOption", () => {
    it("records a selection for a given option group", () => {
      useConfiguratorStore
        .getState()
        .selectOption("collar_style", mockCollarOption);
      expect(
        useConfiguratorStore.getState().selectedOptions["collar_style"],
      ).toEqual(mockCollarOption);
    });

    it("replaces a previous selection in the same group", () => {
      /**
       * WHY REPLACE (NOT ACCUMULATE):
       * Each option group allows exactly one choice. If the customer picks
       * "Spread Collar" then changes to "Button-Down", the old selection
       * must be replaced. This matches the UI where only one option card
       * can be highlighted per step.
       */
      const buttonDown: ProductOption = {
        ...mockCollarOption,
        id: "opt-1b",
        name: "Button-Down",
      };
      useConfiguratorStore
        .getState()
        .selectOption("collar_style", mockCollarOption);
      useConfiguratorStore.getState().selectOption("collar_style", buttonDown);
      expect(
        useConfiguratorStore.getState().selectedOptions["collar_style"],
      ).toEqual(buttonDown);
    });

    it("preserves selections in other groups", () => {
      useConfiguratorStore
        .getState()
        .selectOption("collar_style", mockCollarOption);
      useConfiguratorStore
        .getState()
        .selectOption("cuff_style", mockCuffOption);

      const state = useConfiguratorStore.getState();
      expect(state.selectedOptions["collar_style"]).toEqual(mockCollarOption);
      expect(state.selectedOptions["cuff_style"]).toEqual(mockCuffOption);
    });
  });

  // --------------------------------------------------------------------------
  // STEP NAVIGATION
  //
  // The configurator has these steps:
  //   Step 0: Fabric selection
  //   Step 1..N: One step per option_group (from product.option_groups)
  //   Step N+1: Review summary
  //
  // Total steps = 1 (fabric) + option_groups.length + 1 (review)
  // For mockProduct with 3 option groups: steps 0-4 (5 total)
  // --------------------------------------------------------------------------

  describe("nextStep", () => {
    it("increments the step by 1", () => {
      useConfiguratorStore.getState().setProduct(mockProduct);
      useConfiguratorStore.getState().nextStep();
      expect(useConfiguratorStore.getState().currentStep).toBe(1);
    });

    it("does not exceed the total number of steps", () => {
      /**
       * WHY CLAMP AT MAX:
       * The review step is the last step. Pressing "Next" on the review
       * screen should be a no-op — the next action is "Place Order", which
       * is a different flow entirely. Without clamping, the step index
       * could go out of bounds and crash when looking up option_groups[step].
       */
      useConfiguratorStore.getState().setProduct(mockProduct);
      // mockProduct has 3 option groups → total steps = 5 (0-4)
      // Step 0: fabric, Steps 1-3: options, Step 4: review
      for (let i = 0; i < 10; i++) {
        useConfiguratorStore.getState().nextStep();
      }
      // Should be clamped at step 4 (review)
      expect(useConfiguratorStore.getState().currentStep).toBe(4);
    });

    it("does nothing if no product is set", () => {
      /**
       * WHY GUARD ON NO PRODUCT:
       * Without a product, we don't know how many steps exist (depends on
       * option_groups.length). Allowing nextStep without a product would
       * increment blindly with no upper bound.
       */
      useConfiguratorStore.getState().nextStep();
      expect(useConfiguratorStore.getState().currentStep).toBe(0);
    });
  });

  describe("prevStep", () => {
    it("decrements the step by 1", () => {
      useConfiguratorStore.getState().setProduct(mockProduct);
      useConfiguratorStore.getState().nextStep();
      useConfiguratorStore.getState().nextStep();
      useConfiguratorStore.getState().prevStep();
      expect(useConfiguratorStore.getState().currentStep).toBe(1);
    });

    it("does not go below 0", () => {
      useConfiguratorStore.getState().prevStep();
      expect(useConfiguratorStore.getState().currentStep).toBe(0);
    });
  });

  describe("goToStep", () => {
    /**
     * WHY DIRECT STEP NAVIGATION:
     * The plan specifies tappable progress bar steps — power users can jump
     * directly to any completed or current step. This action enables that.
     */
    it("jumps to a specific step", () => {
      useConfiguratorStore.getState().setProduct(mockProduct);
      useConfiguratorStore.getState().goToStep(3);
      expect(useConfiguratorStore.getState().currentStep).toBe(3);
    });

    it("clamps to valid range (no negative)", () => {
      useConfiguratorStore.getState().setProduct(mockProduct);
      useConfiguratorStore.getState().goToStep(-1);
      expect(useConfiguratorStore.getState().currentStep).toBe(0);
    });

    it("clamps to valid range (no overflow)", () => {
      useConfiguratorStore.getState().setProduct(mockProduct);
      useConfiguratorStore.getState().goToStep(99);
      // Max step for 3 option groups = 4 (review)
      expect(useConfiguratorStore.getState().currentStep).toBe(4);
    });
  });

  // --------------------------------------------------------------------------
  // SET CUSTOMER NOTES
  // --------------------------------------------------------------------------

  describe("setCustomerNotes", () => {
    it("updates the customer notes", () => {
      useConfiguratorStore
        .getState()
        .setCustomerNotes("Please use mother-of-pearl buttons");
      expect(useConfiguratorStore.getState().customerNotes).toBe(
        "Please use mother-of-pearl buttons",
      );
    });
  });

  // --------------------------------------------------------------------------
  // RESET
  // --------------------------------------------------------------------------

  describe("reset", () => {
    it("clears all state back to initial values", () => {
      /**
       * WHY A FULL RESET:
       * When the customer finishes or cancels the configurator, we need to
       * wipe everything so the next configuration starts clean. Partial
       * resets would risk stale data leaking into the next order.
       */
      const {
        setProduct,
        setFabric,
        selectOption,
        nextStep,
        setCustomerNotes,
      } = useConfiguratorStore.getState();

      // Build up full state
      setProduct(mockProduct);
      setFabric(mockFabric);
      selectOption("collar_style", mockCollarOption);
      selectOption("cuff_style", mockCuffOption);
      nextStep();
      nextStep();
      setCustomerNotes("Rush order please");

      // Reset
      useConfiguratorStore.getState().reset();

      const state = useConfiguratorStore.getState();
      expect(state.product).toBeNull();
      expect(state.fabric).toBeNull();
      expect(state.selectedOptions).toEqual({});
      expect(state.currentStep).toBe(0);
      expect(state.customerNotes).toBe("");
    });
  });

  // --------------------------------------------------------------------------
  // COMPUTED: TOTAL STEPS
  //
  // This is a derived value, not stored state. It calculates the total number
  // of steps based on the selected product's option_groups.
  // --------------------------------------------------------------------------

  describe("totalSteps", () => {
    it("returns 0 when no product is set", () => {
      expect(useConfiguratorStore.getState().totalSteps()).toBe(0);
    });

    it("returns 1 (fabric) + option_groups.length + 1 (review)", () => {
      /**
       * WHY THIS FORMULA:
       * The wizard always has a fabric step first, then one step per
       * configurable option group, then a review step at the end.
       * For a Dress Shirt with 3 groups: 1 + 3 + 1 = 5 steps total.
       */
      useConfiguratorStore.getState().setProduct(mockProduct);
      // mockProduct has 3 option groups → 1 + 3 + 1 = 5
      expect(useConfiguratorStore.getState().totalSteps()).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // COMPUTED: IS REVIEW STEP
  // --------------------------------------------------------------------------

  describe("isReviewStep", () => {
    it("returns false when not on the last step", () => {
      useConfiguratorStore.getState().setProduct(mockProduct);
      expect(useConfiguratorStore.getState().isReviewStep()).toBe(false);
    });

    it("returns true when on the last step", () => {
      useConfiguratorStore.getState().setProduct(mockProduct);
      // Navigate to step 4 (the review step for 3 option groups)
      useConfiguratorStore.getState().goToStep(4);
      expect(useConfiguratorStore.getState().isReviewStep()).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // COMPUTED: CURRENT OPTION GROUP
  //
  // Returns the option_group name for the current step, or null if on the
  // fabric step (0) or review step (last).
  // --------------------------------------------------------------------------

  describe("currentOptionGroup", () => {
    it("returns null on the fabric step (step 0)", () => {
      useConfiguratorStore.getState().setProduct(mockProduct);
      expect(useConfiguratorStore.getState().currentOptionGroup()).toBeNull();
    });

    it("returns the correct option group for option steps", () => {
      useConfiguratorStore.getState().setProduct(mockProduct);
      // Step 1 → first option group = "collar_style"
      useConfiguratorStore.getState().goToStep(1);
      expect(useConfiguratorStore.getState().currentOptionGroup()).toBe(
        "collar_style",
      );

      // Step 2 → "cuff_style"
      useConfiguratorStore.getState().goToStep(2);
      expect(useConfiguratorStore.getState().currentOptionGroup()).toBe(
        "cuff_style",
      );

      // Step 3 → "pocket_style"
      useConfiguratorStore.getState().goToStep(3);
      expect(useConfiguratorStore.getState().currentOptionGroup()).toBe(
        "pocket_style",
      );
    });

    it("returns null on the review step", () => {
      useConfiguratorStore.getState().setProduct(mockProduct);
      useConfiguratorStore.getState().goToStep(4); // review
      expect(useConfiguratorStore.getState().currentOptionGroup()).toBeNull();
    });

    it("returns null when no product is set", () => {
      expect(useConfiguratorStore.getState().currentOptionGroup()).toBeNull();
    });
  });
});
