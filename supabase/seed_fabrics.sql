-- =============================================================================
-- Seed data for the fabrics table
--
-- Run this in the Supabase SQL Editor (or via supabase db reset if using local dev).
--
-- NOTES:
-- - price_per_meter is stored in cents (e.g., 4500 = $45.00)
-- - image_url uses placeholder URLs — replace with actual Supabase Storage URLs
--   once fabric images are uploaded to the `fabrics` bucket.
-- - color_tags enable multi-faceted filtering in the catalog UI.
-- - UUIDs are generated automatically via gen_random_uuid().
-- =============================================================================

-- We omit `id`, `created_at`, and `updated_at` — Supabase generates these
-- automatically via column defaults (gen_random_uuid() and now()).
INSERT INTO fabrics (name, description, image_url, price_per_meter, color_tags, available)
VALUES
  -- ===== WOOL =====
  ('Super 120s Charcoal Wool',
   'Premium Italian Super 120s wool in a classic charcoal. Soft hand feel with excellent drape — ideal for year-round suits.',
   'https://placeholder.co/fabrics/super-120s-charcoal.jpg',
   8500,
   ARRAY['charcoal', 'grey'],
   true),

  ('Super 150s Navy Wool',
   'Luxury Super 150s Merino wool in deep navy. Exceptionally fine fibers give a silky finish. Best for formal and business suits.',
   'https://placeholder.co/fabrics/super-150s-navy.jpg',
   12000,
   ARRAY['navy', 'blue'],
   true),

  ('Charcoal Pinstripe Wool',
   'Classic chalk pinstripe on charcoal ground. Medium weight wool blend with a structured feel — a timeless boardroom choice.',
   'https://placeholder.co/fabrics/charcoal-pinstripe.jpg',
   9500,
   ARRAY['charcoal', 'grey', 'white', 'pinstripe'],
   true),

  ('Mid Grey Flannel',
   'Soft brushed flannel in versatile mid grey. Slightly heavier weight makes it perfect for autumn/winter suits and trousers.',
   'https://placeholder.co/fabrics/mid-grey-flannel.jpg',
   7800,
   ARRAY['grey'],
   true),

  ('Black Wool Crepe',
   'Dense black wool crepe with a matte finish. Wrinkle-resistant and sharp — ideal for evening wear and formal trousers.',
   'https://placeholder.co/fabrics/black-wool-crepe.jpg',
   8000,
   ARRAY['black'],
   true),

  ('Camel Wool Twill',
   'Rich camel-colored wool twill weave. Adds warmth and a relaxed elegance to blazers and sport coats.',
   'https://placeholder.co/fabrics/camel-wool-twill.jpg',
   8800,
   ARRAY['camel', 'tan', 'brown'],
   true),

  -- ===== LINEN =====
  ('White Irish Linen',
   'Crisp pure linen from Ireland. Breathable and lightweight — a summer essential for shirts and unstructured blazers.',
   'https://placeholder.co/fabrics/white-irish-linen.jpg',
   6500,
   ARRAY['white'],
   true),

  ('Sky Blue Linen',
   'Soft sky blue linen with a relaxed texture. Perfect for casual summer shirts and resort-style trousers.',
   'https://placeholder.co/fabrics/sky-blue-linen.jpg',
   6500,
   ARRAY['blue', 'light blue'],
   true),

  ('Olive Linen Blend',
   'Linen-cotton blend in a muted olive tone. More structured than pure linen with less wrinkling — great for casual suits.',
   'https://placeholder.co/fabrics/olive-linen-blend.jpg',
   5800,
   ARRAY['olive', 'green'],
   true),

  -- ===== COTTON =====
  ('White Egyptian Cotton Poplin',
   'Ultra-fine Egyptian cotton poplin with a smooth, crisp finish. The gold standard for dress shirts.',
   'https://placeholder.co/fabrics/white-egyptian-poplin.jpg',
   4500,
   ARRAY['white'],
   true),

  ('Light Blue Oxford Cotton',
   'Classic Oxford weave cotton in pale blue. Slightly textured, versatile enough for both office and casual wear.',
   'https://placeholder.co/fabrics/light-blue-oxford.jpg',
   3800,
   ARRAY['blue', 'light blue'],
   true),

  ('Pink Bengal Stripe Cotton',
   'Fine cotton with alternating pink and white Bengal stripes. A staple for business-casual dress shirts.',
   'https://placeholder.co/fabrics/pink-bengal-stripe.jpg',
   4200,
   ARRAY['pink', 'white', 'stripe'],
   true),

  ('Navy Cotton Chino Twill',
   'Sturdy cotton twill in deep navy. Heavy enough for structured chinos and casual trousers.',
   'https://placeholder.co/fabrics/navy-cotton-chino.jpg',
   3500,
   ARRAY['navy', 'blue'],
   true),

  ('Khaki Cotton Twill',
   'Medium-weight cotton twill in classic khaki. A wardrobe staple for everyday trousers.',
   'https://placeholder.co/fabrics/khaki-cotton-twill.jpg',
   3200,
   ARRAY['khaki', 'tan', 'beige'],
   true),

  -- ===== SILK & BLENDS =====
  ('Midnight Blue Silk Shantung',
   'Textured silk shantung in deep midnight blue. The natural slubs create a unique character — perfect for evening jackets.',
   'https://placeholder.co/fabrics/midnight-silk-shantung.jpg',
   15000,
   ARRAY['navy', 'blue'],
   true),

  ('Ivory Silk Satin',
   'Lustrous ivory silk satin with a subtle sheen. Reserved for formal occasions — wedding waistcoats and bow ties.',
   'https://placeholder.co/fabrics/ivory-silk-satin.jpg',
   16500,
   ARRAY['ivory', 'white', 'cream'],
   true),

  ('Wool-Silk Navy Hopsack',
   'A 70/30 wool-silk blend in a hopsack weave. Open weave breathes well while silk adds a soft luster. Excellent for summer blazers.',
   'https://placeholder.co/fabrics/navy-wool-silk-hopsack.jpg',
   11000,
   ARRAY['navy', 'blue'],
   true),

  -- ===== TWEED & HERITAGE =====
  ('Harris Tweed Herringbone',
   'Authentic Harris Tweed in brown herringbone. Handwoven in Scotland — durable, warm, and full of character.',
   'https://placeholder.co/fabrics/harris-tweed-herringbone.jpg',
   9800,
   ARRAY['brown', 'tan', 'herringbone'],
   true),

  ('Donegal Tweed Fleck',
   'Irish Donegal tweed with multi-color flecks on a grey ground. Rustic texture ideal for country sport coats.',
   'https://placeholder.co/fabrics/donegal-tweed-fleck.jpg',
   9200,
   ARRAY['grey', 'multi'],
   true),

  -- ===== OUT OF STOCK (to test availability filtering) =====
  ('Burgundy Velvet',
   'Rich cotton velvet in deep burgundy. Seasonal fabric for dinner jackets — currently out of stock.',
   'https://placeholder.co/fabrics/burgundy-velvet.jpg',
   13500,
   ARRAY['burgundy', 'red'],
   false),

  ('Emerald Green Silk Dupioni',
   'Vibrant emerald dupioni silk with a crisp texture. Limited seasonal run — currently unavailable.',
   'https://placeholder.co/fabrics/emerald-silk-dupioni.jpg',
   14000,
   ARRAY['green', 'emerald'],
   false);
