# Fabric Catalog Feature — Implementation Plan

## Step 1: Data layer (`src/features/catalog/`) ✅ DONE
- **`api.ts`** — `fetchFabrics(filters?)` with optional `availableOnly` and `colorTag` filters, `fetchFabricById(id)` with `.single()`
- **`hooks.ts`** — `useFabrics(filters?)` and `useFabric(id)` with 5-min staleTime, filter-aware cache keys, `enabled: !!id` guard on detail query

## Step 2: UI components (`src/features/catalog/components/`)
- **`FabricCard.tsx`** — Card showing fabric image, name, price, color tags. Used in the grid/list.
- **`FabricDetailModal.tsx`** — Tappable modal/bottom sheet showing full fabric details (larger image, description, price, availability)

## Step 3: Screen + navigation (`app/(app)/`)
- **`fabrics.tsx`** — The catalog screen with a FlatList grid of FabricCards, pull-to-refresh, loading/error states
- Update `_layout.tsx` to switch from Stack to **Tabs** (Home + Fabrics tabs), since we now have two top-level sections — the layout comment even anticipates this

## Why this order matters (interview talking point)
Building bottom-up (data → components → screen) means each layer is testable in isolation. The hooks don't depend on any UI, and the components don't depend on navigation. This matches the 3-layer pattern already established in auth (screen → hook → api).

## Before starting — check
- ✅ Seed data loaded — 20 fabrics via `supabase/seed_fabrics.sql` (placeholder image URLs)
- ⚠️ Real images still needed — upload to Supabase Storage `fabrics` bucket and update URLs

## Next up
Step 2: UI components (FabricCard + FabricDetailModal)
