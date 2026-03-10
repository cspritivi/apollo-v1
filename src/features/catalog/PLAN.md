# Fabric Catalog Feature — Implementation Plan

## Step 1: Data layer (`src/features/catalog/`)
- **`api.ts`** — Supabase query functions: `fetchFabrics` (with optional filters for color tags, availability) and `fetchFabricById`
- **`hooks.ts`** — React Query hooks: `useFabrics` and `useFabric` that wrap the API calls with caching

## Step 2: UI components (`src/features/catalog/components/`)
- **`FabricCard.tsx`** — Card showing fabric image, name, price, color tags. Used in the grid/list.
- **`FabricDetailModal.tsx`** — Tappable modal/bottom sheet showing full fabric details (larger image, description, price, availability)

## Step 3: Screen + navigation (`app/(app)/`)
- **`fabrics.tsx`** — The catalog screen with a FlatList grid of FabricCards, pull-to-refresh, loading/error states
- Update `_layout.tsx` to switch from Stack to **Tabs** (Home + Fabrics tabs), since we now have two top-level sections — the layout comment even anticipates this

## Why this order matters (interview talking point)
Building bottom-up (data → components → screen) means each layer is testable in isolation. The hooks don't depend on any UI, and the components don't depend on navigation. This matches the 3-layer pattern already established in auth (screen → hook → api).

## Before starting — check
- **Do you have seed data in Supabase yet?** (Sample fabrics with images in Storage.)
- If not, we need to seed a few rows first so the catalog actually renders. Claude can provide the SQL insert statements.

## Starting point
Begin with Step 1 (data layer), or seed data first if needed.
