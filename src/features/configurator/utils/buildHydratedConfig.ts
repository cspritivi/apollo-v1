/**
 * buildHydratedConfig -- pure reconciliation between a persisted
 * ConfiguratorSnapshot and freshly-loaded catalog data.
 *
 * WHY THIS LIVES IN A SEPARATE HELPER (NOT INSIDE `hydrate`):
 * The `hydrate` action on configuratorStore stays atomic and dumb -- it
 * just sets all slices in one update. All the messy "is this option
 * still in the catalog? is the fabric still available? is the saved
 * step still in range?" logic lives here as a pure function. That makes
 * `hydrate` trivial to reason about and lets us unit-test all the
 * staleness branches without spinning up the store.
 *
 * WHY OPTIONS ARE CHECKED BY PRESENCE (not `available`):
 * `useProductOptions` already filters its query by `available = true` in
 * `fetchProductOptions`. So the loaded `groupedOptions` is the set of
 * options the customer can choose right now -- presence is enough.
 *
 * WHY FABRIC IS CHECKED EXPLICITLY:
 * `fetchFabricById` does NOT filter by `available`, so a snapshot can
 * point to a fabric that is now soft-deleted. We check
 * `fabric.available !== false` here to keep the behavior aligned with
 * the option-availability policy.
 *
 * WHY notes-only DRAFTS ARE PRESERVED:
 * A customer might type "please use mother-of-pearl buttons" before
 * walking away. Returning null on a notes-only snapshot would silently
 * discard that work. Non-empty is defined as: fabric kept OR at least
 * one valid option OR customerNotes.trim().length > 0.
 */

import { Fabric, Product, ProductOption } from "@/types";
import { ConfiguratorSnapshot } from "@/stores/configuratorSnapshotStore";

export interface HydratedConfig {
  product: Product;
  fabric: Fabric | null;
  selectedOptions: Record<string, ProductOption>;
  currentStep: number;
  customerNotes: string;
}

/**
 * Total steps = fabric step + N option steps + review step.
 * Duplicated from configuratorStore's internal `calculateTotalSteps` so
 * that this helper has zero dependency on the store. Cheap to recompute.
 */
function totalStepsFor(product: Product): number {
  return 1 + product.option_groups.length + 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function buildHydratedConfig(
  snapshot: ConfiguratorSnapshot,
  product: Product,
  groupedOptions: Record<string, ProductOption[]>,
  fabric: Fabric | null | undefined,
): HydratedConfig | null {
  // --- Reconcile fabric ---
  // Drop when missing entirely OR explicitly unavailable. Either case
  // collapses to `null` so the configurator falls back to "no fabric
  // selected" and forces the customer to pick one again.
  const reconciledFabric: Fabric | null =
    fabric && fabric.available !== false ? fabric : null;

  // --- Reconcile option selections ---
  // Walk every (group, optionId) the snapshot has and keep it only when
  // we can find a matching option in the loaded `groupedOptions[group]`.
  // Stale ids drop silently. Groups that no longer exist on the product
  // also drop silently (groupedOptions[group] is undefined).
  const reconciledOptions: Record<string, ProductOption> = {};
  for (const [group, optionId] of Object.entries(snapshot.selectedOptionIds)) {
    const groupOptions = groupedOptions[group];
    if (!groupOptions) continue;
    const match = groupOptions.find((opt) => opt.id === optionId);
    if (match) {
      reconciledOptions[group] = match;
    }
  }

  // --- Clamp currentStep ---
  // The product's option_groups may have grown or shrunk since save,
  // so the saved index could now be out of range. Clamp into [0, last].
  const lastStepIndex = totalStepsFor(product) - 1;
  const reconciledStep = clamp(snapshot.currentStep, 0, lastStepIndex);

  // --- Non-empty check ---
  // If literally nothing survives, return null so the caller falls back
  // to setProduct (a true fresh start). Notes-only drafts count as
  // non-empty -- whitespace doesn't.
  const hasFabric = reconciledFabric !== null;
  const hasAnyOption = Object.keys(reconciledOptions).length > 0;
  const hasNotes = snapshot.customerNotes.trim().length > 0;
  if (!hasFabric && !hasAnyOption && !hasNotes) {
    return null;
  }

  return {
    product,
    fabric: reconciledFabric,
    selectedOptions: reconciledOptions,
    currentStep: reconciledStep,
    customerNotes: snapshot.customerNotes,
  };
}
