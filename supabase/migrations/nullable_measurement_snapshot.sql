-- Make measurement_snapshot nullable on orders.
--
-- Measurements are taken in-person by the tailor, not entered by the customer.
-- Orders are placed before measurements are taken, so this column must accept
-- null. The tailor attaches measurements when the customer visits the shop.
--
-- Order lifecycle with this change:
--   PLACED (no measurements) → Customer visits shop → Tailor takes measurements
--     → Tailor attaches to order via dashboard → IN_PRODUCTION → ...

ALTER TABLE public.orders
  ALTER COLUMN measurement_snapshot DROP NOT NULL;
