# Plan — Issue #49: Restore configurator state from recently viewed

> Working document for the implementation of issue #49. Delete this file
> when the feature ships.

Issue: https://github.com/cspritivi/apollo-v1/issues/49

---

## Goal

When a customer taps a recently viewed product on the Home screen, restore
their exact configurator state (fabric, options, current step, notes)
instead of starting fresh. Show a subtle "In Progress" indicator on the
card so the customer knows they have a saved configuration.

## Current state (verified 2026-04-27)

- `useConfiguratorStore` has **no persistence** — pure in-memory.
- `app/(app)/(tabs)/(products)/configurator.tsx:124-126` resets the store
  on unmount, so any tab switch / back nav loses everything.
- `setProduct()` in the store also resets all other slices on product
  change (`configuratorStore.ts:117-126`), so we need a distinct hydration
  path that does not run reset.
- `useRecentlyViewedStore` only stores display fields (id, type, name,
  imageUrl, price, viewedAt). Capped at 20 with LRU eviction.

## Architecture

**Separate `configuratorSnapshotStore`, keyed by productId**, rather than
embedding snapshot data in `recentlyViewedStore`. Reasons:

- Snapshots are product-only (fabrics don't have configurator state) —
  embedding pollutes the recently viewed item type.
- Different lifecycle: snapshots get cleared on order/cart-add; recently
  viewed entries stick around for browsing history.
- Cleaner test surface — snapshot logic doesn't entangle with LRU/dedup
  logic of recently viewed.

Snapshot shape (IDs only, not full objects — configurator already refetches
via React Query):

```ts
interface ConfiguratorSnapshot {
  fabricId: string | null;
  selectedOptionIds: Record<string, string>; // option_group → option id
  currentStep: number;
  customerNotes: string;
  savedAt: number; // unix ms
}
```

## Phased implementation (TDD throughout)

### Phase 1 — `configuratorSnapshotStore`

- New file `src/stores/configuratorSnapshotStore.ts`, persisted via
  AsyncStorage (matches `recentlyViewedStore` and `cartStore`).
- Actions: `saveSnapshot(productId, snapshot)`,
  `getSnapshot(productId)`, `clearSnapshot(productId)`, `clearAll()`.
- LRU cap at 20 entries (matches recently viewed, keeps storage lean).
- Tests first: `__tests__/configuratorSnapshotStore.test.ts`.

### Phase 2 — Hydration action on `configuratorStore`

- Add `hydrate({ product, fabric, selectedOptions, currentStep, customerNotes })`
  that sets all fields atomically without the reset behavior of
  `setProduct`.
- Tests for hydrate: valid full input, partial input where some option
  IDs are stale, missing fabric.

### Phase 3 — Save snapshot on configurator unmount

- In `configurator.tsx`, replace the bare `reset()` cleanup with:
  capture snapshot first if any selection exists (fabric set OR ≥1
  option selected OR notes non-empty), then reset.
- Use `useConfiguratorStore.getState()` inside the cleanup — closure
  captures stale state otherwise.

### Phase 4 — Restore snapshot on configurator mount

- On mount with `productId`, look up snapshot.
- Wait for `product` AND `groupedOptions` AND (if `snapshot.fabricId`)
  the fabric data to all load.
- Validate each `selectedOptionIds[group]` still exists in the loaded
  options for that group — drop invalid entries silently (matches issue
  spec: "gracefully ignore invalid selections rather than crashing").
- Call `hydrate(...)` once with the validated reconstruction. If
  invalid/no snapshot, fall back to `setProduct(product)`.
- May need a `useFabric(id)` hook if not already present — to verify
  during implementation.

### Phase 5 — "In Progress" indicator on `RecentlyViewedRow`

- Subscribe to snapshot store; for each product item, check
  `getSnapshot(item.id)`.
- Visual: small pill in the top-right corner of the card reading
  "In Progress". Indigo `#4f46e5` background, white text.
- A11y: append ", in progress" to `accessibilityLabel`.

### Phase 6 — Clear snapshot when configuration is consumed

- In `handleAddToCart` and `handlePlaceOrderNow`:
  `clearSnapshot(product.id)` before `reset()`. Configuration has been
  used — no longer "in progress".

### Phase 7 — IA.md entry

Document the architectural choices for portfolio talking points:
- Why a separate snapshot store (vs extending recently viewed).
- Why ID-only snapshots (vs full object snapshots).
- Why partial-restore over drop-on-staleness.
- The unmount-save / mount-restore pattern and why it beats
  per-keystroke persistence.

## Files affected

- `src/stores/configuratorSnapshotStore.ts` (new)
- `src/stores/__tests__/configuratorSnapshotStore.test.ts` (new)
- `src/stores/configuratorStore.ts` — add `hydrate` action
- `src/stores/__tests__/configuratorStore.test.ts` — extend tests
- `src/components/RecentlyViewedRow.tsx` — "In Progress" pill
- `src/components/__tests__/RecentlyViewedRow.test.tsx` — extend tests
- `app/(app)/(tabs)/(products)/configurator.tsx` — save on unmount,
  restore on mount, clear on cart-add / order
- `IA.md` — new section

---

## Open decisions (need Pritivi's call before implementation)

Defaults are listed; flag any to flip.

### 1. Save trigger
- **Default: unmount-only** (simpler).
- Alternative: also debounced on every selection change (more resilient
  to hard crashes).
- The only way to "lose" an unmount-only snapshot is a hard crash, which
  is rare in dev/preview builds and almost-never in production once
  Sentry is wired up (#36).

### 2. Stale snapshot policy
- **Default: partial-restore** (keep what's still valid, drop what
  isn't).
- Alternative: drop the whole snapshot if any single ID is invalid.
- Losing a single removed collar option shouldn't wipe the customer's
  fabric selection and notes — partial-restore is more user-friendly.

### 3. Indicator style
- **Default: small "In Progress" pill** (text on the card corner).
- Alternatives: small indigo dot, progress ring showing % completed.
- Pill is most explicit, easiest to localize later (i18n #38), and
  doesn't require computing completion percentages.

### 4. Snapshot lifecycle on cart-add
- **Default: yes, clear the snapshot** when item is added to cart.
- Alternative: keep snapshot until order is placed (cart can still be
  edited, conceptually).
- Once added to cart the configuration is consumed and should not show
  "In Progress" on the recently viewed row anymore.

### 5. TTL
- **Default: LRU eviction only** (no TTL).
- Alternative: expire snapshots after N days (e.g., 30) regardless of
  recency.
- TTL adds complexity (timestamp checks on every read) for negligible
  gain at a 20-item cap.

---

## How to respond

Just leave a note here (or in chat) like:

> 1. unmount-only ✅
> 2. partial ✅
> 3. dot, not pill
> 4. clear on cart-add ✅
> 5. LRU only ✅

…and I'll start the TDD implementation.
