# Product Catalog + Configurator — Implementation Plan

## User Journey

```
Home → Products Tab → Product List → Tap a Product → Configurator (step-by-step)
                                                        |
                                              Step 1: Choose Fabric
                                              Step 2: collar_style (with images)
                                              Step 3: cuff_style (with images)
                                              Step 4: pocket_style (with images)
                                              ...one step per option_group
                                              Final Step: Review & Summary
```

---

## Screens & What the Customer Sees

### 1. Product List Screen (new tab)

- 2-column grid of product cards (same layout pattern as fabrics)
- Each card: product image, name, base price, short description
- Only `available = true` products shown

### 2. Configurator — Multi-Step Wizard

Full-screen step-by-step flow after tapping a product:

- **Step 1 — Choose Fabric**: Reuses existing fabric catalog grid with color filters. Shows fabric image, name, price/m.
- **Steps 2–N — Option Groups**: One step per `option_group` on the product (e.g., collar_style, cuff_style). Each step shows:
  - Large image for each option (from `product_options.image_url`)
  - Option name, description, and price modifier (e.g., "+$20")
  - Selected option highlighted with border/checkmark
  - Progress bar at top showing current step
- **Final Step — Review Summary**: Visual recap before proceeding to order:
  - Product name + image
  - Selected fabric swatch image + name + price
  - Each chosen option with image, name, and price modifier
  - Total price breakdown (base + fabric + option modifiers)
  - Customer notes text input

### 3. Visualization Strategy

- Every ProductOption has an image_url — visual options are meaningless without pictures
- Configurator shows large preview images (not tiny thumbnails)
- Review screen shows a visual grid of all choices side-by-side
- Option cards use horizontal scrollable row or 2-column grid depending on count

---

## Implementation Steps

| # | Step | Files | Status |
|---|---|---|---|
| 1 | Seed data — 3 products + 42 product_options with image URLs | `supabase/seed_products.sql` | [x] Done |
| 2 | Upload option images to Supabase Storage | `scripts/upload-product-images.ts` | [x] Done — 45 images uploaded |
| 3 | Products data layer — API functions + React Query hooks | `src/features/catalog/api.ts`, `hooks.ts` | [x] Done |
| 4 | Products tab + list screen — ProductCard component, add tab | `app/(app)/products.tsx`, `ProductCard.tsx`, `_layout.tsx` | [x] Done |
| 5 | Configurator Zustand store — selections across steps | `src/stores/configuratorStore.ts` | [x] Done (store + 30 tests passing) |
| 6 | Configurator screen — step-by-step wizard shell | `app/(app)/configurator.tsx` | [x] Done |
| 7 | Fabric selection step — reuse fabric grid inside configurator | `src/features/configurator/components/FabricSelectionStep.tsx` | [x] Done |
| 8 | Option selection step — generic component for any option group | `src/features/configurator/components/OptionStep.tsx`, `OptionCard.tsx` | [x] Done |
| 9 | Progress bar — visual stepper | `src/features/configurator/components/ProgressBar.tsx` | [x] Done |
| 10 | Review summary — visual recap with price breakdown | `src/features/configurator/components/ReviewSummary.tsx` | [x] Done |
| 11 | Maestro E2E tests | `.maestro/configurator/` | [ ] |

---

## Data Layer

### New API Functions (`src/features/catalog/api.ts`)

- `fetchProducts()` — all available products
- `fetchProductById(id)` — single product with details
- `fetchProductOptions(optionGroups: string[])` — all options matching a product's option_groups

### New Hooks (`src/features/catalog/hooks.ts`)

- `useProducts()` — cached product list
- `useProduct(id)` — single product
- `useProductOptions(optionGroups)` — options grouped for configurator steps

---

## Configurator Zustand Store (`src/stores/configuratorStore.ts`) — IMPLEMENTED

```ts
{
  // State
  product: Product | null,
  fabric: Fabric | null,
  selectedOptions: Record<string, ProductOption>,  // e.g. { "collar_style": {...} }
  currentStep: number,
  customerNotes: string,

  // Actions
  setProduct, setFabric, selectOption, nextStep, prevStep, goToStep, setCustomerNotes, reset,

  // Computed helpers
  totalSteps(),        // 1 (fabric) + option_groups.length + 1 (review), or 0 if no product
  isReviewStep(),      // true when currentStep === totalSteps - 1
  currentOptionGroup() // maps step index to option_group name, null for fabric/review steps
}
```

Why Zustand: The configurator spans multiple steps/components. Passing selections
through navigation params would be fragile. Zustand gives every step component
direct access to the shared configuration state.

Key behaviors (defined by tests):
- `setProduct` resets all other state (fabric, options, step, notes) — prevents stale cross-product state
- `nextStep`/`prevStep`/`goToStep` all clamp to valid range [0, totalSteps-1]
- `nextStep` is a no-op if no product is set (can't calculate bounds)
- Step mapping: step 0 = fabric, steps 1–N = option groups, step N+1 = review

---

## Navigation Changes

- Add **"Products" tab** alongside Home and Fabrics in `_layout.tsx`
- Configurator is a **full-screen stack screen** pushed on top of tabs (not a tab itself) — needs full screen + back button

---

## Seed Data — Products

| Product | Option Groups |
|---|---|
| Two-Piece Suit | `lapel_style`, `button_count`, `vent_style`, `lining_style`, `pocket_style` |
| Dress Shirt | `collar_style`, `cuff_style`, `placket_style`, `pocket_style`, `back_pleat` |
| Trousers | `fit_style`, `pleat_style`, `hem_style`, `pocket_style`, `waistband_style` |

Each option group has 2-4 options, each with an image.

---

## Resolved Decisions

- **Image sourcing**: ChatGPT AI-generated images for now, replaced with real photos later. Image URLs point to Supabase Storage.
- **Fabric quantity**: Use a naive constant per product type (e.g., Suit = 3.5m, Shirt = 2.5m, Trousers = 1.8m). Store as `fabric_meters` on the `products` table. In the future, this could be derived from customer measurements via a formula, but a constant is good enough for MVP.
- **Step navigation**: The progress bar steps are tappable — customers can jump to any completed or current step directly. Sequential (next/prev) is the default flow for first-time UX, but power users can tap the progress bar to revisit any step without going back one-by-one.

---

## What Was Built (Session 2026-03-15)

### Completed
- **Image prompts** — 45 prompts (3 products + 42 options) written to `IMAGE_PROMPTS.md` with consistent style (studio lighting, white bg, 1024x1024 square)
- **Data layer** — `fetchProducts`, `fetchProductById`, `fetchProductOptions` added to `api.ts`. Corresponding hooks `useProducts`, `useProduct`, `useProductOptions` added to `hooks.ts`. The `useProductOptions` hook uses React Query's `select` to group the flat option array into `Record<string, ProductOption[]>`
- **ProductCard component** — Grid card with image (+ letter fallback), name, description, "From $X" pricing
- **Products screen** — 2-column grid with loading/error/empty states, pull-to-refresh, navigates to configurator on tap
- **Tab layout updated** — Products tab added between Fabrics and Home. Configurator registered as hidden screen (`href: null`)
- **Configurator placeholder** — Reads `productId` param, ready for full implementation

## What Was Built (Session 2 — 2026-03-15)

### Completed
- **Jest test setup** — installed `jest-expo`, `jest`, `@types/jest`. Added `test` and `test:watch` scripts to `package.json`. Jest config with `jest-expo` preset added.
- **Configurator store tests (TDD Red phase)** — 22 tests written in `src/stores/__tests__/configuratorStore.test.ts` covering: initial state, setProduct (with reset side effect), setFabric, selectOption (replace semantics), nextStep/prevStep/goToStep (with clamping), setCustomerNotes, reset, and computed helpers (totalSteps, isReviewStep, currentOptionGroup).
- **Configurator store implementation (TDD Green phase)** — `src/stores/configuratorStore.ts` written with all actions and computed helpers matching the test spec. Uses extracted `initialState` constant and `clampStep`/`calculateTotalSteps` helpers.
- **CLAUDE.md updated** — TDD is now mandatory for all future features.

### Blocker (resolved session 3)
- Tests failed with `jest-expo` runtime scoping error. Fixed in session 3 by switching to Jest `projects` config.

---

## What Was Built (Session 3 — 2026-03-18)

### Completed
- **Jest config fixed** — switched from single `jest-expo` preset to Jest `projects` config. Pure logic tests (stores, hooks, lib) use `ts-jest` + Node environment. Component tests use `jest-expo`. All 30 store tests now pass.
- **Seed data** — `supabase/seed_products.sql` with 3 products (Two-Piece Suit, Dress Shirt, Trousers) and 42 product options across 15 option groups, with descriptions and price modifiers.
- **Image upload script** — `scripts/upload-product-images.ts` following same pattern as fabric upload script. Explicit file-to-database mapping. All 45 images uploaded to `product-images` Supabase Storage bucket.
- **ProgressBar** — tappable step indicator with numbered circles, connecting lines, step labels. Controlled component (no internal state).
- **OptionCard** — large image + name + description + price modifier + selection badge. Reusable for any option group.
- **OptionStep** — generic data-driven step for any option group. 2-column grid of OptionCards. Includes `formatOptionGroupTitle` utility.
- **FabricSelectionStep** — reuses `useFabrics` hook + `ColorFilterBar`. Simplified card focused on selection (no save button — deferred to future improvement).
- **ReviewSummary** — visual recap with product/fabric/option images, customer notes input, price breakdown.
- **Configurator wizard shell** — thin orchestrator connecting route params → React Query hooks → Zustand store → step components. Handles loading/error states, step rendering, Next/Back/Cancel navigation. Next button disabled until selection is made.
- **IA.MD updated** — added Open-Closed Principle interview answer for generic OptionStep.
- **CLAUDE.md updated** — added fabric save+detail in configurator to Future Features.

---

## What Was Built (Session 4 — 2026-03-18)

### Bug Fixes
- **Odd-count grid stretching** — FlatList with `numColumns={2}` and `flex:1` cards causes the last card to stretch full-width when the item count is odd. Fixed in `OptionStep` and `FabricSelectionStep` by appending a null spacer (same pattern already used in the main catalog screens). Added `columnWrapperStyle` with `justifyContent: "space-between"`.
- **ProgressBar completion is now selection-based, not positional** — Previously, steps were marked "completed" (solid purple) just because the user navigated past them. Now, a step only shows a checkmark when the user has actually made a selection for it. The configurator screen computes a `completedSteps` Set from the Zustand store (fabric set → step 0 done, option selected → that step done) and passes it to the ProgressBar. Visual states: current+completed = solid indigo + white checkmark, completed = light indigo + indigo checkmark, current = light indigo + step number, upcoming = grey outline.
- **Product options scoped by product_id FK** — `pocket_style` options were showing all products' pocket options because `product_options` had no FK to `products`. Added `product_id uuid NOT NULL REFERENCES products(id)` to the schema. Updated seed SQL to use a CTE that captures product UUIDs on insert. API now filters by `product_id` instead of `.in("option_group", ...)`. Hook simplified to `useProductOptions(productId)`. Migration SQL provided for live database backfill.

### Files Changed
- `src/features/configurator/components/OptionStep.tsx` — null-spacer fix
- `src/features/configurator/components/FabricSelectionStep.tsx` — null-spacer fix
- `src/features/configurator/components/ProgressBar.tsx` — `completedSteps` prop, selection-based completion
- `app/(app)/configurator.tsx` — computes `completedSteps`, passes `product?.id` to hook
- `src/features/catalog/api.ts` — `fetchProductOptions(productId)` replaces option_groups filter
- `src/features/catalog/hooks.ts` — `useProductOptions(productId)` simplified
- `src/types/index.ts` — `product_id` added to `ProductOption`
- `supabase/init_schema.sql` — `product_id` FK + composite index
- `supabase/seed_products.sql` — CTE-based inserts with product_id
- `supabase/migrations/add_product_id_to_options.sql` — live DB migration
- `src/stores/__tests__/configuratorStore.test.ts` — `product_id` added to mock fixtures

### UX Improvements
- **Review page tappable selections** — Fabric and each option group row on the ReviewSummary are now `Pressable`. Tapping jumps back to the corresponding configurator step (fabric = step 0, option groups = steps 1..N) via `onGoToStep`. Each row shows a subtle grey chevron `›` to hint at tappability. The subtitle reads "Tap any selection to change it" instead of repeating "Edit" on every row.
- **ProgressBar moved to bottom** — Relocated from the top of the screen to below the Next/Back buttons. Puts all navigation in the thumb zone. The customer can tap any step (including Review) without reaching to the top of the screen.
- **ProgressBar label cleanup** — Labels are only shown for the current step (not all steps). The label is absolutely positioned and centered under the current circle using `measureLayout` for pixel-perfect alignment. Long names like "Waistband Style" display without truncation.

### Files Changed (continued)
- `src/features/configurator/components/ReviewSummary.tsx` — tappable fabric/option rows, `onGoToStep` prop, chevron indicators
- `src/features/configurator/components/ProgressBar.tsx` — moved to bottom, label only on current step, `measureLayout`-based centering
- `app/(app)/configurator.tsx` — bottom bar layout (navRow + ProgressBar), passes `goToStep` to ReviewSummary
- `CLAUDE.md` — added swipe navigation, one-tap auto-advance, 3D Touch preview, and Maestro E2E to Future Features

### Next Session
- Maestro E2E tests for configurator flow (step 11)
- Order placement flow (next major feature)
