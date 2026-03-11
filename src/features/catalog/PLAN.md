# Fabric Catalog Feature — Implementation Plan

## Step 1: Data layer (`src/features/catalog/`) ✅ DONE
- **`api.ts`** — `fetchFabrics(filters?)` with optional `availableOnly` and `colorTag` filters, `fetchFabricById(id)` with `.single()`
- **`hooks.ts`** — `useFabrics(filters?)` and `useFabric(id)` with 5-min staleTime, filter-aware cache keys, `enabled: !!id` guard on detail query

## Step 2: UI components (`src/features/catalog/components/`) ✅ DONE
- **`FabricCard.tsx`** — Card showing fabric image, name, price, color tags. Used in the 2-column grid.
- **`FabricDetailModal.tsx`** — Modal (pageSheet) showing full fabric details (larger image, description, price, availability badge, color tags)

## Step 3: Screen + navigation (`app/(app)/`) ✅ DONE
- **`fabrics.tsx`** — Catalog screen with 2-column FlatList grid, pull-to-refresh, loading/error/empty states
- Updated `_layout.tsx` from Stack to **Tabs** (Home + Fabrics tabs)

## Step 4: Maestro E2E tests (`.maestro/catalog/`) ✅ DONE
- **`browse-fabrics.yaml`** — Login → navigate to Fabrics tab → verify catalog grid renders seed data
- **`fabric-detail-modal.yaml`** — Tap card → verify modal opens with details → close modal
- **`pull-to-refresh.yaml`** — Pull down → verify data persists after refresh

## Why this order matters (interview talking point)
Building bottom-up (data → components → screen) means each layer is testable in isolation. The hooks don't depend on any UI, and the components don't depend on navigation. This matches the 3-layer pattern already established in auth (screen → hook → api).

## Before starting — check
- ✅ Seed data loaded — 20 fabrics via `supabase/seed_fabrics.sql` (placeholder image URLs)
- ⚠️ Real images still needed — upload to Supabase Storage `fabrics` bucket and update URLs

## Next up
- Upload real fabric images to Supabase Storage and update URLs
- Color tag filter UI (chips/pills that filter the grid by color)
- Product catalog + configurator feature
