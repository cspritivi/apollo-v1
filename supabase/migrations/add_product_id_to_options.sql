-- =============================================================================
-- Migration: Add product_id FK to product_options
--
-- WHY THIS MIGRATION:
-- Multiple products share the same option_group name (e.g., "pocket_style"
-- exists on suits, shirts, and trousers). Without a product_id FK, the
-- configurator query fetches ALL pocket_style options across all products.
-- This migration adds the FK and backfills it by matching each option's
-- option_group against the product that declares that group.
--
-- RUN ORDER:
-- 1. Run this migration in the Supabase SQL Editor
-- 2. Verify the backfill: SELECT id, product_id, option_group, name FROM product_options ORDER BY product_id, option_group;
-- 3. If correct, the NOT NULL constraint will hold. If any rows have NULL
--    product_id after the backfill, investigate before proceeding.
--
-- ROLLBACK (if needed):
--   ALTER TABLE product_options DROP COLUMN product_id;
--   DROP INDEX IF EXISTS idx_product_options_product_group;
--   CREATE INDEX idx_product_options_group ON product_options(option_group);
-- =============================================================================

-- Step 1: Add the column as nullable first (so existing rows don't block it).
ALTER TABLE public.product_options
  ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

-- Step 2: Backfill — for each option, find the product whose option_groups
-- array contains that option's option_group value.
--
-- NOTE: If an option_group exists on multiple products (e.g., pocket_style),
-- this UPDATE assigns it to ALL matching products via a correlated subquery.
-- Since pocket_style options are currently duplicated (suit pockets, shirt
-- pockets, trouser pockets all have option_group = 'pocket_style'), we need
-- a smarter backfill. We use the image_url prefix convention to distinguish:
--   suit-pocket-* → Two-Piece Suit
--   shirt-pocket-* → Dress Shirt
--   trouser-pocket-* → Trousers
--
-- For non-overlapping groups, the simple subquery works.

-- Backfill non-overlapping groups (only one product has the group).
UPDATE public.product_options po
SET product_id = (
  SELECT p.id FROM public.products p
  WHERE po.option_group = ANY(p.option_groups)
  LIMIT 1
)
WHERE po.option_group NOT IN ('pocket_style');

-- Backfill pocket_style by image_url prefix convention.
UPDATE public.product_options po
SET product_id = (SELECT p.id FROM public.products p WHERE p.name = 'Two-Piece Suit')
WHERE po.option_group = 'pocket_style'
  AND po.image_url LIKE '%suit-pocket%';

UPDATE public.product_options po
SET product_id = (SELECT p.id FROM public.products p WHERE p.name = 'Dress Shirt')
WHERE po.option_group = 'pocket_style'
  AND po.image_url LIKE '%shirt-pocket%';

UPDATE public.product_options po
SET product_id = (SELECT p.id FROM public.products p WHERE p.name = 'Trousers')
WHERE po.option_group = 'pocket_style'
  AND po.image_url LIKE '%trouser-pocket%';

-- Step 3: Make the column NOT NULL now that all rows are backfilled.
ALTER TABLE public.product_options
  ALTER COLUMN product_id SET NOT NULL;

-- Step 4: Replace the old index with a composite one.
DROP INDEX IF EXISTS idx_product_options_group;
CREATE INDEX idx_product_options_product_group
  ON public.product_options(product_id, option_group);
