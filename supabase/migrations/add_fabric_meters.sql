-- Add fabric_meters to products table.
--
-- Each product type requires a different amount of fabric: a suit ~3.5m,
-- a shirt ~2.5m, trousers ~1.8m. This column enables transparent pricing:
-- total fabric cost = fabric.price_per_meter × product.fabric_meters.
--
-- WHY A CONSTANT PER PRODUCT (not per customer):
-- True fabric usage depends on body size, cutting efficiency, and fabric width.
-- A constant is a reasonable approximation for pricing — the tailor adjusts
-- if needed. When measurement-based yardage calculation is added later, only
-- this value changes; the pricing formula stays the same.

ALTER TABLE public.products
  ADD COLUMN fabric_meters numeric NOT NULL DEFAULT 2.5;

-- Backfill with product-specific values based on industry averages
UPDATE public.products SET fabric_meters = 3.5 WHERE name = 'Two-Piece Suit';
UPDATE public.products SET fabric_meters = 2.5 WHERE name = 'Dress Shirt';
UPDATE public.products SET fabric_meters = 1.8 WHERE name = 'Trousers';
