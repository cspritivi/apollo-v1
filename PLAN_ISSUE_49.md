# Plan -- Issue #49: Restore configurator state from recently viewed

> Working document for the implementation of issue #49. Delete this file
> when the feature ships.

Issue: https://github.com/cspritivi/apollo-v1/issues/49

---

## Goal

When a customer taps a recently viewed product on the Home screen, restore
their exact configurator state (fabric, options, current step, notes)
instead of starting fresh. Show a subtle "In Progress" indicator on the
card so the customer knows they have a saved configuration.

## Current state (verified 2026-04-27, route paths re-verified 2026-04-29)

- `useConfiguratorStore` has **no persistence** -- pure in-memory.
- `app/(app)/(tabs)/(products)/configurator.tsx` resets the store on
  unmount, so any tab switch / back nav loses everything.
- `setProduct()` in the store also resets all other slices on product
  change, so we need a distinct hydration path that does not run reset.
- `useRecentlyViewedStore` only stores display fields (id, type, name,
  imageUrl, price, viewedAt). Capped at 20 with LRU eviction.
- Routes: Home navigates to `pathname: "/(products)/configurator"`
  (`app/(app)/(tabs)/(home)/index.tsx:53`); the products tab uses the
  relative `pathname: "/configurator"` (`(products)/index.tsx:69`).
  We follow Home's pattern, not invent a third shape.
- `RecentlyViewedRow` does not navigate itself; the parent passes
  `onItemPress`. So the resume route param is decided in Home's handler,
  not in the row component.

## Architecture

**Separate `configuratorSnapshotStore`, keyed by productId**, rather than
embedding snapshot data in `recentlyViewedStore`. Reasons:

- Snapshots are product-only (fabrics don't have configurator state) --
  embedding pollutes the recently viewed item type.
- Different lifecycle: snapshots get cleared on order/cart-add; recently
  viewed entries stick around for browsing history.
- Cleaner test surface -- snapshot logic doesn't entangle with LRU/dedup
  logic of recently viewed.

Snapshot shape (IDs only, not full objects -- configurator already
refetches via React Query):

```ts
interface ConfiguratorSnapshot {
  fabricId: string | null;
  selectedOptionIds: Record<string, string>; // option_group -> option id
  currentStep: number;
  customerNotes: string;
  savedAt: number; // unix ms
}
```

## Phased implementation (TDD throughout)

### Phase 1 -- `configuratorSnapshotStore`

- New file `src/stores/configuratorSnapshotStore.ts`, persisted via
  AsyncStorage (matches `recentlyViewedStore` and `cartStore`).
- State: `snapshots: Record<productId, ConfiguratorSnapshot>` and
  `hasHydrated: boolean` (false until `onRehydrateStorage` fires).
- Actions: `saveSnapshot(productId, snapshot)`,
  `getSnapshot(productId)`, `clearSnapshot(productId)`, `clearAll()`,
  internal `_setHasHydrated(true)`.
- LRU cap at 20 entries. **Eviction rule:** after each `saveSnapshot`,
  if `Object.keys(snapshots).length > 20`, drop the entry with the
  smallest `savedAt`. (A plain `Record` has no insertion order
  guarantees we can rely on across rehydrate, so we evict by
  `savedAt`, not by Map insertion order.)
- Tests first: `__tests__/configuratorSnapshotStore.test.ts`. Cover
  hydration (pre-hydration `getSnapshot` returns undefined and
  `hasHydrated` is false; after rehydrate, both reflect persisted
  data), save/get/clear, and LRU eviction (insert 21, lowest-savedAt
  is gone).

Why a hydration gate: AsyncStorage rehydrates asynchronously, so
`getSnapshot(id)` can return undefined on the first render even when a
saved snapshot exists. Phases 4 and 5 must wait on `hasHydrated`
before deciding "no snapshot" or rendering the In Progress pill.

### Phase 2 -- atomic `hydrate` action + pure validation helper

Two pieces, deliberately separated:

**(a) `hydrate(config)` on `configuratorStore`** -- atomic setter only.
Takes already-resolved objects: `{ product, fabric | null,
selectedOptions: Record<groupName, ProductOption>, currentStep: number,
customerNotes: string }`. Sets all slices in one update, no reset
behavior. Pure write.

**(b) `buildHydratedConfig(snapshot, product, groupedOptions, fabric)`**
-- pure helper, lives in `src/features/configurator/utils/`.
Responsible for all reconciliation:

- Drop entries in `selectedOptionIds` whose option no longer exists in
  the loaded `groupedOptions` for that group.
- Drop the fabric if `fabric` is null/undefined or
  `fabric.available === false` (see Decision #7).
- Clamp `currentStep` to `[0, calculateTotalSteps(product) - 1]` in
  case option groups changed.
- **Non-empty definition for return value:** the helper returns the
  reconstructed config when ANY of the following hold post-validation:
  fabric is kept, OR at least one option survived validation, OR
  `customerNotes.trim().length > 0`. Otherwise returns `null`. This
  preserves notes-only drafts (a customer may have only typed notes
  before walking away) -- they should not be silently discarded.

Why split: `hydrate` stays simple and atomic (easy to reason about and
test). All staleness logic is one pure function -- easy unit tests for
"option removed", "fabric unavailable", "step out of range",
"notes-only draft survives", "snapshot fully invalidated returns null".

Tests:
- `hydrate`: sets all slices in one render; subsequent reads reflect
  new state; does not invoke `setProduct`'s reset path.
- `buildHydratedConfig`: full valid snapshot, one stale option,
  unavailable fabric, out-of-range currentStep, notes-only draft,
  fully invalidated returns null.

### Phase 3 -- Save snapshot on configurator unmount

- In `configurator.tsx`, replace the bare `reset()` cleanup with:
  capture snapshot first if any selection exists (fabric set OR >=1
  option selected OR `customerNotes.trim()` non-empty), then reset.
- Use `useConfiguratorStore.getState()` inside the cleanup -- closure
  captures stale state otherwise.
- **Consume guard:** keep a `consumedRef = useRef(false)` on the
  screen. Cart-add and order-success set it to `true` (after they
  call `clearSnapshot`). The cleanup checks `consumedRef.current`
  and skips the save if true. Prevents the cleanup from re-saving a
  configuration that was just cart-added or ordered.

### Phase 4 -- Restore snapshot on configurator mount

**Replace the existing eager `setProduct(product)` effect.** Do not
layer the restore logic on top of it -- a single init path owns
initialization for all cases. Layering risks a brief "fresh start"
flash before the resume decision lands, which causes flicker and
confuses the prompt timing.

**Hooks must be unconditional.** Read the snapshot once at the top of
the component:

```ts
const snapshot = useConfiguratorSnapshotStore(
  (s) => (productId ? s.snapshots[productId] : undefined)
);
const snapshotFabricId = snapshot?.fabricId ?? undefined;
const { data: fabric } = useFabric(snapshotFabricId);
```

`useFabric` is always called; passing `undefined` is its no-op case.
This satisfies the rules of hooks regardless of whether a snapshot
exists.

**Initialization gate -- wait for all of:**
- snapshot store `hasHydrated === true`
- `product` query loaded
- `groupedOptions` loaded
- if `snapshotFabricId` is defined, the fabric query has resolved
  (success or error)

**While the gate is open, render an "Initializing" loading state**
(reuse the existing "Loading configurator..." view). Do NOT render the
fresh-config UI in the meantime -- otherwise the customer sees a
blank step 1 for a frame before the resume prompt or auto-restore
takes over. The single init path also means no `setProduct` runs
until the decision is made.

**Decision tree (runs once per mount, guarded by `initRef`):**

1. Read snapshot via the selector above.
2. If absent -> `setProduct(product)`. Done.
3. Else, run `buildHydratedConfig(snapshot, product, groupedOptions,
   fabric)`.
4. If helper returns `null` (fully invalidated) -> `clearSnapshot`,
   `setProduct(product)`. Done.
5. Else, branch on entry point (route param `resume`):
   - `resume === "1"` (recently viewed tap, see Phase 5) ->
     **auto-restore**: `hydrate(config)`. No prompt. This matches
     issue #49's stated behavior.
   - Otherwise (catalog -> product detail -> Customize) -> show the
     **resume prompt**: "Resume your previous configuration?" with
     `Resume` and `Start fresh`.
     - Resume -> `hydrate(config)`.
     - Start fresh -> `clearSnapshot(productId)`,
       `setProduct(product)`.

This split keeps the issue-spec auto-restore on the recently-viewed
path while still preventing silent overwrite when the customer enters
fresh from the catalog.

### Phase 5 -- "In Progress" indicator + resume route param

Two surfaces touched: `RecentlyViewedRow` (renders the pill) and the
Home screen's `onItemPress` handler (decides the route param).

**`RecentlyViewedRow`:**

- Subscribe to the snapshot store. For each product item, check
  `snapshots[item.id]`. **Gate on `hasHydrated`** -- do not render the
  pill until the store has rehydrated, otherwise the pill flickers
  in/out on cold start.
- Visual: small pill in the top-right corner of the card image
  reading "In Progress". Indigo `#4f46e5` background, white text.
- Positioning: the card already has `overflow: "hidden"`. Set
  `position: "relative"` on the existing image View (or wrap the
  `AppImage` in a relative-positioned View) and render the pill with
  `position: "absolute"` inside it.
- A11y: append ", in progress" to `accessibilityLabel`.
- Test file is **new**: `src/components/__tests__/RecentlyViewedRow.test.tsx`
  does not currently exist. Cover: pill renders only when snapshot
  present and hydrated; a11y label includes ", in progress".

**Home screen `onItemPress` (`app/(app)/(tabs)/(home)/index.tsx`):**

- Read snapshot existence for the tapped product id.
- Pass `resume` as a route param using the existing route shape:

  ```ts
  router.push({
    pathname: "/(products)/configurator",
    params: {
      productId: item.id,
      resume: hasSnapshot ? "1" : "0",
    },
  });
  ```

- Phase 4 reads `useLocalSearchParams<{ resume?: string }>()` to
  decide auto-restore vs. prompt.
- Catalog tab navigation (`(products)/index.tsx`) is left unchanged
  -- omitting the `resume` param defaults to the prompt branch.

### Phase 6 -- Clear snapshot when configuration is consumed

Clear only on confirmed success, never speculatively before a
mutation. If an order fails, the customer's draft is still valid
work-in-progress.

- **`handleAddToCart`** -- local cart add is synchronous via Zustand,
  so success is immediate. After `addToCart(...)`:
  `consumedRef.current = true`, `clearSnapshot(product.id)`,
  `reset()`.
- **`handlePlaceOrderNow`** -- the order is a server mutation. Move
  the cleanup into `onSuccess` of the mutation:
  `consumedRef.current = true`, `clearSnapshot(product.id)`,
  `reset()`. On error, do nothing -- the draft remains, the customer
  can retry without losing state.

The `consumedRef` flag works with Phase 3's unmount-cleanup guard so
that the cleanup cannot recreate the snapshot we just cleared.

### Phase 7 -- IA.md entry

Document the architectural choices for portfolio talking points:
- Why a separate snapshot store (vs extending recently viewed).
- Why ID-only snapshots (vs full object snapshots).
- Why partial-restore over drop-on-staleness, including notes-only.
- The unmount-save / mount-restore pattern and why it beats
  per-keystroke persistence.
- The hydration gate and why it matters for AsyncStorage-backed
  Zustand persist.
- The route-param-driven auto-restore vs. prompt split.

## Files affected

- `src/stores/configuratorSnapshotStore.ts` (new)
- `src/stores/__tests__/configuratorSnapshotStore.test.ts` (new)
- `src/stores/configuratorStore.ts` -- add atomic `hydrate` action
- `src/stores/__tests__/configuratorStore.test.ts` -- extend tests
- `src/features/configurator/utils/buildHydratedConfig.ts` (new) --
  pure reconciliation helper
- `src/features/configurator/utils/__tests__/buildHydratedConfig.test.ts`
  (new)
- `src/components/RecentlyViewedRow.tsx` -- "In Progress" pill,
  hydration gate, snapshot subscription
- `src/components/__tests__/RecentlyViewedRow.test.tsx` (new -- file
  does not currently exist)
- `app/(app)/(tabs)/(home)/index.tsx` -- pass `resume` route param
  in `onItemPress` based on snapshot presence
- `app/(app)/(tabs)/(products)/configurator.tsx` -- single init path
  (replace eager `setProduct` effect), initializing render state,
  save on unmount with consume guard, clear on cart-add / order
  success
- `IA.md` -- new section

---

## Decisions (resolved 2026-04-29)

1. **Save trigger:** unmount-only. Hard-crash loss accepted; revisit
   if Sentry (#36) shows it's a real problem.
2. **Stale snapshot policy:** partial-restore. Drop only invalid IDs,
   keep the rest. Notes-only drafts are also preserved.
3. **Indicator style:** "In Progress" pill (text on card corner,
   indigo bg, white text).
4. **Snapshot lifecycle on consume:** clear after cart-add (immediate)
   and inside order mutation `onSuccess` (never before). Order
   failures preserve the draft.
5. **TTL:** LRU eviction only, cap 20. Eviction by lowest `savedAt`
   after each save.
6. **Multiple drafts per product:** one snapshot per productId
   (last-write-wins). Recently-viewed tap auto-restores (issue #49
   spec). Catalog-entry path shows a resume/start-fresh prompt so the
   customer is never silently overwritten on a second visit.
   Multi-named-drafts is deferred to issue #22.
7. **Unavailable fabric on restore:** drop. Mirrors the option-drop
   policy (issue spec: "gracefully ignore invalid selections").
   `fetchFabricById` does not currently filter by `available`, so
   `buildHydratedConfig` must check `fabric.available !== false`
   before keeping it. If the customer resumes and finds their fabric
   gone, partial-restore preserves the rest (options, notes, step).
