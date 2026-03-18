-- =============================================================================
-- Seed data for the products and product_options tables
--
-- Run this in the Supabase SQL Editor AFTER init_schema.sql.
--
-- NOTES:
-- - base_price is stored in cents (e.g., 45000 = $450.00)
-- - price_modifier on options is also in cents (e.g., 2000 = $20.00)
-- - image_url uses placeholder URLs — replaced with actual Supabase Storage
--   URLs by the upload-product-images.ts script.
-- - option_groups on products must exactly match the option_group values
--   on the corresponding product_options rows.
-- - UUIDs are generated automatically via gen_random_uuid().
-- =============================================================================

-- =============================================================================
-- PRODUCTS
-- =============================================================================

INSERT INTO products (name, description, base_price, image_url, option_groups, available)
VALUES
  ('Two-Piece Suit',
   'A classic two-piece suit tailored to your exact measurements. Choose your lapel, buttons, vents, lining, and pockets.',
   45000,
   'https://placeholder.co/products/two-piece-suit.jpg',
   ARRAY['lapel_style', 'button_count', 'vent_style', 'lining_style', 'pocket_style'],
   true),

  ('Dress Shirt',
   'A bespoke dress shirt crafted from your chosen fabric. Customize collar, cuffs, placket, pocket, and back pleat.',
   15000,
   'https://placeholder.co/products/dress-shirt.jpg',
   ARRAY['collar_style', 'cuff_style', 'placket_style', 'pocket_style', 'back_pleat'],
   true),

  ('Trousers',
   'Custom-tailored trousers with your choice of fit, pleats, hem, pockets, and waistband style.',
   18000,
   'https://placeholder.co/products/trousers.jpg',
   ARRAY['fit_style', 'pleat_style', 'hem_style', 'pocket_style', 'waistband_style'],
   true);

-- =============================================================================
-- PRODUCT OPTIONS — SUIT
-- =============================================================================

-- Lapel Style
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('lapel_style', 'Notch Lapel',
   'The most versatile lapel — a V-shaped notch where the collar meets the lapel. Works for business and casual.',
   'https://placeholder.co/options/suit-lapel-notch.jpg', 0, true),
  ('lapel_style', 'Peak Lapel',
   'A bold, formal lapel that points upward and outward. Makes shoulders appear broader. Classic for double-breasted suits and formal wear.',
   'https://placeholder.co/options/suit-lapel-peak.jpg', 0, true),
  ('lapel_style', 'Shawl Lapel',
   'A smooth, continuous curve with no notch. Traditionally reserved for tuxedos and formal dinner jackets.',
   'https://placeholder.co/options/suit-lapel-shawl.jpg', 0, true);

-- Button Count
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('button_count', 'One Button',
   'A single button closure at the waist. Sleek and modern — elongates the torso. Popular for formal and fashion-forward suits.',
   'https://placeholder.co/options/suit-button-one.jpg', 0, true),
  ('button_count', 'Two Button',
   'The most common and versatile style. Top button fastened, bottom left open. A safe, classic choice for any occasion.',
   'https://placeholder.co/options/suit-button-two.jpg', 0, true),
  ('button_count', 'Three Button',
   'A traditional, slightly more conservative look. Middle button always fastened, top optional, bottom never. Adds visual height.',
   'https://placeholder.co/options/suit-button-three.jpg', 0, true);

-- Vent Style
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('vent_style', 'No Vent',
   'A smooth, unbroken back panel. Cleanest silhouette from behind, but restricts movement. Best for slim, fashion-forward fits.',
   'https://placeholder.co/options/suit-vent-none.jpg', 0, true),
  ('vent_style', 'Single Vent',
   'One center slit at the back. The most common style — easy to sit in and practical for everyday wear.',
   'https://placeholder.co/options/suit-vent-single.jpg', 0, true),
  ('vent_style', 'Double Vent',
   'Two side slits for maximum ease of movement. Drapes cleanly when sitting and gives easy pocket access. Preferred in British tailoring.',
   'https://placeholder.co/options/suit-vent-double.jpg', 1500, true);

-- Lining Style
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('lining_style', 'Full Lining',
   'Lining covers the entire interior. Provides structure, smooth drape over dress shirts, and a polished finish. Best for cooler climates.',
   'https://placeholder.co/options/suit-lining-full.jpg', 0, true),
  ('lining_style', 'Half Lining',
   'Lining covers the upper back and chest only. A breathable compromise — some structure with better ventilation for warmer weather.',
   'https://placeholder.co/options/suit-lining-half.jpg', 0, true),
  ('lining_style', 'Unlined',
   'No lining at all — exposed interior seams finished with clean binding. Maximum breathability for summer suits. Softer, more casual drape.',
   'https://placeholder.co/options/suit-lining-unlined.jpg', -2000, true);

-- Pocket Style (Suit)
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('pocket_style', 'Flap Pocket',
   'A rectangular fabric flap covers the pocket opening. The most common and versatile pocket style for business suits.',
   'https://placeholder.co/options/suit-pocket-flap.jpg', 0, true),
  ('pocket_style', 'Welt Pocket',
   'A clean, narrow slit opening with no flap. Minimal and sleek — the most formal pocket style. Also called a jetted pocket.',
   'https://placeholder.co/options/suit-pocket-welt.jpg', 0, true),
  ('pocket_style', 'Patch Pocket',
   'A fabric patch sewn onto the outside of the jacket. Casual and relaxed — best for unstructured blazers and summer suits.',
   'https://placeholder.co/options/suit-pocket-patch.jpg', 0, true);

-- =============================================================================
-- PRODUCT OPTIONS — DRESS SHIRT
-- =============================================================================

-- Collar Style
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('collar_style', 'Spread Collar',
   'Collar points angled wide apart. Works with or without a tie — the wider opening suits larger tie knots like a Windsor.',
   'https://placeholder.co/options/shirt-collar-spread.jpg', 0, true),
  ('collar_style', 'Button-Down',
   'Small buttons fasten each collar point to the shirt front. A relaxed, preppy style that stays neat without a tie.',
   'https://placeholder.co/options/shirt-collar-button-down.jpg', 0, true),
  ('collar_style', 'Mandarin',
   'A short standing band collar with no fold or points. Clean, minimal, and modern — no tie required.',
   'https://placeholder.co/options/shirt-collar-mandarin.jpg', 0, true),
  ('collar_style', 'Cutaway',
   'Collar points spread extremely wide, almost horizontal. The most formal spread — designed for wide tie knots and bold neckwear.',
   'https://placeholder.co/options/shirt-collar-cutaway.jpg', 0, true);

-- Cuff Style
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('cuff_style', 'Barrel Cuff',
   'A standard cuff fastened with one or two buttons. The everyday default — simple, clean, and easy to wear.',
   'https://placeholder.co/options/shirt-cuff-barrel.jpg', 0, true),
  ('cuff_style', 'French Cuff',
   'The cuff folds back on itself and is fastened with cufflinks. Formal and elegant — a statement piece.',
   'https://placeholder.co/options/shirt-cuff-french.jpg', 1500, true),
  ('cuff_style', 'Convertible Cuff',
   'Can be worn with buttons or cufflinks — has holes for both. Maximum versatility for dress-up or dress-down.',
   'https://placeholder.co/options/shirt-cuff-convertible.jpg', 500, true);

-- Placket Style
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('placket_style', 'Standard Placket',
   'A folded strip of fabric with visible buttons down the center front. The classic, most common shirt front.',
   'https://placeholder.co/options/shirt-placket-standard.jpg', 0, true),
  ('placket_style', 'French Placket',
   'Buttons hidden behind a clean, seamless fabric fold. A dressier, minimal look — also called a fly front.',
   'https://placeholder.co/options/shirt-placket-french.jpg', 1000, true);

-- Pocket Style (Shirt)
-- NOTE: These share the option_group name "pocket_style" with suit pockets,
-- but are filtered by the product's option_groups array. In the future, if
-- this causes issues, we can namespace them (e.g., "shirt_pocket_style").
-- For now the configurator fetches options by option_group and shows them
-- in the context of the selected product, so overlap is acceptable.
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('pocket_style', 'No Pocket',
   'A clean, smooth shirt front with no pocket. The most formal and streamlined option.',
   'https://placeholder.co/options/shirt-pocket-none.jpg', 0, true),
  ('pocket_style', 'Chest Pocket',
   'A single patch pocket on the left breast. Practical and traditional — adds a casual touch.',
   'https://placeholder.co/options/shirt-pocket-chest.jpg', 0, true);

-- Back Pleat
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('back_pleat', 'No Pleat',
   'A smooth, flat back with no pleats. Fitted and slim — best for tailored or slim-fit shirts.',
   'https://placeholder.co/options/shirt-pleat-none.jpg', 0, true),
  ('back_pleat', 'Box Pleat',
   'A single wide fold at the center back below the yoke. Provides extra room for movement. The most common pleat.',
   'https://placeholder.co/options/shirt-pleat-box.jpg', 0, true),
  ('back_pleat', 'Side Pleats',
   'Two narrow folds, one on each side of the back near the shoulders. Balanced ease of movement with a tailored look.',
   'https://placeholder.co/options/shirt-pleat-side.jpg', 0, true);

-- =============================================================================
-- PRODUCT OPTIONS — TROUSERS
-- =============================================================================

-- Fit Style
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('fit_style', 'Slim Fit',
   'Tapered through the thigh and leg for a narrow, modern silhouette. Best for leaner builds.',
   'https://placeholder.co/options/trouser-fit-slim.jpg', 0, true),
  ('fit_style', 'Regular Fit',
   'A straight leg with comfortable room through hip and thigh. The classic, versatile everyday fit.',
   'https://placeholder.co/options/trouser-fit-regular.jpg', 0, true),
  ('fit_style', 'Relaxed Fit',
   'Generous room through hip, thigh, and leg. Maximum comfort — ideal for larger builds or casual wear.',
   'https://placeholder.co/options/trouser-fit-relaxed.jpg', 0, true);

-- Pleat Style
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('pleat_style', 'Flat Front',
   'Smooth fabric with no pleats or folds. The modern standard — clean and streamlined.',
   'https://placeholder.co/options/trouser-pleat-flat.jpg', 0, true),
  ('pleat_style', 'Single Pleat',
   'One fabric fold on each side near the waistband. A subtle touch of classic tailoring that adds room at the hip.',
   'https://placeholder.co/options/trouser-pleat-single.jpg', 0, true),
  ('pleat_style', 'Double Pleat',
   'Two fabric folds on each side near the waistband. Traditional and generous — pairs well with relaxed fits.',
   'https://placeholder.co/options/trouser-pleat-double.jpg', 0, true);

-- Hem Style
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('hem_style', 'Plain Hem',
   'A clean, straight finished edge with no cuff. The most versatile hem — works with any trouser style.',
   'https://placeholder.co/options/trouser-hem-plain.jpg', 0, true),
  ('hem_style', 'Cuffed Hem',
   'Fabric folded up to create a visible horizontal band at the ankle. Adds weight for better drape. A classic touch.',
   'https://placeholder.co/options/trouser-hem-cuffed.jpg', 500, true),
  ('hem_style', 'Tapered Hem',
   'The leg narrows significantly at the ankle for a modern, slim finish. Best paired with slim or regular fits.',
   'https://placeholder.co/options/trouser-hem-tapered.jpg', 0, true);

-- Pocket Style (Trousers)
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('pocket_style', 'Slant Pocket',
   'The pocket opening is cut at a diagonal angle from the waistband. The most common trouser pocket — easy to access and flattering.',
   'https://placeholder.co/options/trouser-pocket-slant.jpg', 0, true),
  ('pocket_style', 'Vertical Pocket',
   'The pocket opening is a straight vertical slit along the side seam. A more formal, traditional style. Also called an on-seam pocket.',
   'https://placeholder.co/options/trouser-pocket-vertical.jpg', 0, true);

-- Waistband Style
INSERT INTO product_options (option_group, name, description, image_url, price_modifier, available)
VALUES
  ('waistband_style', 'Standard Waistband',
   'A classic waistband with visible belt loops and a button closure. Works with any belt for a traditional look.',
   'https://placeholder.co/options/trouser-waistband-standard.jpg', 0, true),
  ('waistband_style', 'Extended Waistband',
   'The waistband extends past the button with a hook clasp closure. No belt loops — a cleaner, more formal finish.',
   'https://placeholder.co/options/trouser-waistband-extended.jpg', 1000, true);
