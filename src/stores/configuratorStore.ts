/**
 * Configurator Zustand Store
 *
 * Manages the multi-step product configuration wizard state. This store is
 * the single source of truth for what the customer has selected across all
 * configurator steps (product, fabric, options, notes).
 *
 * WHY ZUSTAND (NOT CONTEXT OR NAVIGATION PARAMS):
 * The configurator spans multiple screens/steps. Passing state through
 * navigation params would be fragile (serialization issues, prop drilling
 * through the step components). React Context would work but requires a
 * Provider wrapper and re-renders the entire tree on any state change.
 * Zustand gives us a lightweight singleton store with surgical re-renders —
 * each step component subscribes only to the slice of state it needs.
 *
 * WHY A STORE (NOT REACT QUERY):
 * This is client-owned state, not server state. The configurator selections
 * don't exist in Supabase until the customer places the order. React Query
 * is for server-synced data; Zustand is for ephemeral client state like this.
 *
 * INTERVIEW TALKING POINT:
 * "We separate server state (React Query) from client state (Zustand) because
 * they have fundamentally different lifecycles. Server state needs caching,
 * invalidation, and background refetching. Client state like the configurator
 * is ephemeral — it exists only during the configuration session and is
 * discarded (reset) when the customer finishes or cancels."
 */

import { create } from "zustand";
import { Product, Fabric, ProductOption } from "@/types";

// ============================================================================
// STORE TYPES
// ============================================================================

interface ConfiguratorState {
  // --- Stored state ---
  product: Product | null;
  fabric: Fabric | null;
  /** Maps option_group name → selected ProductOption. E.g., { "collar_style": {...} } */
  selectedOptions: Record<string, ProductOption>;
  currentStep: number;
  customerNotes: string;

  // --- Actions ---
  setProduct: (product: Product) => void;
  setFabric: (fabric: Fabric) => void;
  selectOption: (optionGroup: string, option: ProductOption) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  setCustomerNotes: (notes: string) => void;
  reset: () => void;

  // --- Computed helpers ---
  /**
   * Total number of steps in the wizard.
   * Formula: 1 (fabric) + option_groups.length + 1 (review)
   * Returns 0 if no product is set (we can't calculate steps without knowing
   * how many option groups the product has).
   */
  totalSteps: () => number;
  /** True when currentStep is the review (final) step. */
  isReviewStep: () => boolean;
  /**
   * Returns the option_group name for the current step, or null if the
   * current step is fabric selection (step 0) or review (last step).
   */
  currentOptionGroup: () => string | null;
}

// ============================================================================
// INITIAL STATE
//
// Extracted as a constant so reset() can restore to exactly this shape.
// Without this, reset would need to duplicate the initial values — a
// maintenance hazard if we add new fields later.
// ============================================================================

const initialState = {
  product: null as Product | null,
  fabric: null as Fabric | null,
  selectedOptions: {} as Record<string, ProductOption>,
  currentStep: 0,
  customerNotes: "",
};

// ============================================================================
// HELPER: clampStep
//
// Constrains a step index to the valid range [0, maxStep].
// Used by nextStep, prevStep, and goToStep to prevent out-of-bounds access.
// ============================================================================

function clampStep(step: number, maxStep: number): number {
  return Math.max(0, Math.min(step, maxStep));
}

/**
 * Calculates total steps from a product's option_groups.
 * Separated from the store so it can be used in both the computed helper
 * and the navigation actions without accessing `get()` multiple times.
 */
function calculateTotalSteps(product: Product | null): number {
  if (!product) return 0;
  // 1 (fabric step) + N (option steps) + 1 (review step)
  return 1 + product.option_groups.length + 1;
}

// ============================================================================
// STORE
// ============================================================================

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => ({
  ...initialState,

  setProduct: (product) => {
    /**
     * WHY RESET EVERYTHING ON PRODUCT CHANGE:
     * A product's option_groups define the configurator steps. Changing
     * products invalidates all previous selections — a Shirt's collar
     * options don't exist on Trousers. We reset to a clean slate with
     * only the new product set to prevent stale state bugs.
     */
    set({ ...initialState, product });
  },

  setFabric: (fabric) => set({ fabric }),

  selectOption: (optionGroup, option) =>
    set((state) => ({
      /**
       * WHY SPREAD INTO A NEW OBJECT:
       * Zustand uses reference equality to detect changes. Mutating the
       * existing selectedOptions object wouldn't trigger a re-render.
       * Spreading creates a new object reference, which Zustand detects
       * as a change and notifies subscribers.
       */
      selectedOptions: { ...state.selectedOptions, [optionGroup]: option },
    })),

  nextStep: () =>
    set((state) => {
      const total = calculateTotalSteps(state.product);
      // No-op if no product — we don't know the valid step range
      if (total === 0) return state;
      return { currentStep: clampStep(state.currentStep + 1, total - 1) };
    }),

  prevStep: () =>
    set((state) => ({
      currentStep: clampStep(state.currentStep - 1, Infinity),
    })),

  goToStep: (step) =>
    set((state) => {
      const total = calculateTotalSteps(state.product);
      if (total === 0) return state;
      return { currentStep: clampStep(step, total - 1) };
    }),

  setCustomerNotes: (notes) => set({ customerNotes: notes }),

  reset: () => set({ ...initialState }),

  totalSteps: () => calculateTotalSteps(get().product),

  isReviewStep: () => {
    const { product, currentStep } = get();
    const total = calculateTotalSteps(product);
    if (total === 0) return false;
    return currentStep === total - 1;
  },

  currentOptionGroup: () => {
    const { product, currentStep } = get();
    if (!product) return null;
    // Step 0 is fabric selection — no option group
    if (currentStep === 0) return null;
    // Last step is review — no option group
    const total = calculateTotalSteps(product);
    if (currentStep >= total - 1) return null;
    /**
     * WHY currentStep - 1:
     * Option groups start at step 1 (step 0 is fabric). So step 1 maps
     * to option_groups[0], step 2 to option_groups[1], etc. The offset
     * is always -1.
     */
    return product.option_groups[currentStep - 1] ?? null;
  },
}));
