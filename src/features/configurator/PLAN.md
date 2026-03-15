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
| 1 | Seed data — 3 products + ~38 product_options with image URLs | `supabase/seed_products.sql` | [ ] Blocked on image upload |
| 2 | Upload option images to Supabase Storage | Manual / script | [ ] In progress — images being generated via ChatGPT |
| 3 | Products data layer — API functions + React Query hooks | `src/features/catalog/api.ts`, `hooks.ts` | [x] Done |
| 4 | Products tab + list screen — ProductCard component, add tab | `app/(app)/products.tsx`, `ProductCard.tsx`, `_layout.tsx` | [x] Done |
| 5 | Configurator Zustand store — selections across steps | `src/stores/configuratorStore.ts` | [ ] Next up |
| 6 | Configurator screen — step-by-step wizard shell | `app/(app)/configurator.tsx` | [ ] Placeholder created |
| 7 | Fabric selection step — reuse fabric grid inside configurator | `src/features/configurator/components/FabricSelectionStep.tsx` | [ ] |
| 8 | Option selection step — generic component for any option group | `src/features/configurator/components/OptionStep.tsx`, `OptionCard.tsx` | [ ] |
| 9 | Progress bar — visual stepper | `src/features/configurator/components/ProgressBar.tsx` | [ ] |
| 10 | Review summary — visual recap with price breakdown | `src/features/configurator/components/ReviewSummary.tsx` | [ ] |
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

## Configurator Zustand Store (`src/stores/configuratorStore.ts`)

```ts
{
  product: Product | null,
  fabric: Fabric | null,
  selectedOptions: Record<string, ProductOption>,  // e.g. { "collar_style": {...} }
  currentStep: number,
  customerNotes: string,

  // Actions
  setProduct, setFabric, selectOption, nextStep, prevStep, reset
}
```

Why Zustand: The configurator spans multiple steps/components. Passing selections
through navigation params would be fragile. Zustand gives every step component
direct access to the shared configuration state.

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

### Next Session
- Generate remaining images and upload to Supabase Storage
- Write `seed_products.sql` with real image URLs
- Build Zustand configurator store (step 5)
- Build configurator UI: progress bar, fabric step, option step, review summary (steps 6–10)
