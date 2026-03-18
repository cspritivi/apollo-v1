# Product & Option Image Prompts

Generate these images using ChatGPT/DALL-E. Upload to Supabase Storage
in a `product-images/` bucket (or similar), then update the seed SQL
with the resulting URLs.

All prompts use a consistent style: studio lighting, white background,
product photography. This ensures visual cohesion across the app.

**All images: 1024x1024 (square).** Square aspect ratio works for both
the 2-column product grid and the configurator option cards. The app
uses `resizeMode="cover"` with `aspectRatio: 1` so everything crops
consistently. Add "Square format, 1:1 aspect ratio." to each prompt
when generating.

---

## Product Images (3)

### product-two-piece-suit.png
A professional studio photo of a navy blue two-piece suit on a mannequin against a clean white background. The suit is well-tailored with visible lapels, two buttons, and a breast pocket. Soft studio lighting, high resolution, product photography style. Square format, 1:1 aspect ratio.

### product-dress-shirt.png
A professional studio photo of a crisp white dress shirt neatly folded on a clean white background. The collar is spread, cuffs visible, fabric is smooth cotton. Soft studio lighting, high resolution, product photography style. Square format, 1:1 aspect ratio.

### product-trousers.png
A professional studio photo of charcoal grey tailored trousers on a mannequin against a clean white background. Flat front, creased legs, slim fit. Soft studio lighting, high resolution, product photography style. Square format, 1:1 aspect ratio.

---

## Suit — Lapel Style (3)

### suit-lapel-notch.png
Close-up photo of a suit jacket's notch lapel on navy fabric against a white background. The lapel shows a clear V-shaped notch where the collar meets the lapel. Studio lighting, product detail shot. Square format, 1:1 aspect ratio.

### suit-lapel-peak.png
Close-up photo of a suit jacket's peak lapel on navy fabric against a white background. The lapel points upward and outward in a wide V shape. Studio lighting, product detail shot. Square format, 1:1 aspect ratio.

### suit-lapel-shawl.png
Close-up photo of a suit jacket's shawl lapel on navy fabric against a white background. The collar and lapel form one smooth, continuous rounded curve with no notch. Studio lighting, product detail shot. Square format, 1:1 aspect ratio.

---

## Suit — Button Count (3)

### suit-button-one.png
Front view of a navy suit jacket on a mannequin showing a single button closure at the waist. Clean white background, studio lighting, product photography. Square format, 1:1 aspect ratio.

### suit-button-two.png
Front view of a navy suit jacket on a mannequin showing two button closures. Clean white background, studio lighting, product photography. Square format, 1:1 aspect ratio.

### suit-button-three.png
Front view of a navy suit jacket on a mannequin showing three button closures stacked vertically. Clean white background, studio lighting, product photography. Square format, 1:1 aspect ratio.

---

## Suit — Vent Style (3)

### suit-vent-none.png
Back view of a navy suit jacket on a mannequin showing no vent — a completely smooth, unbroken back panel. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### suit-vent-single.png
Back view of a navy suit jacket on a mannequin showing a single center vent — one vertical slit at the center of the back. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### suit-vent-double.png
Back view of a navy suit jacket on a mannequin showing double vents — two vertical slits, one on each side of the back. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

---

## Suit — Lining Style (3)

### suit-lining-full.png
Interior view of a navy suit jacket opened to reveal full lining covering the entire inside in a contrasting smooth fabric. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### suit-lining-half.png
Interior view of a navy suit jacket opened to reveal half lining — lining covers the upper back and chest area only, lower half shows the suit fabric. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### suit-lining-unlined.png
Interior view of a navy suit jacket opened to reveal an unlined construction — exposed interior seams finished with clean binding, no lining fabric. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

---

## Suit — Pocket Style (3)

### suit-pocket-flap.png
Close-up of a navy suit jacket pocket with a flap — a rectangular fabric flap covers the pocket opening. Clean white background, studio lighting, product detail shot. Square format, 1:1 aspect ratio.

### suit-pocket-welt.png
Close-up of a navy suit jacket pocket with a welt — a clean, narrow slit opening with no flap, very minimal and formal. Clean white background, studio lighting, product detail shot. Square format, 1:1 aspect ratio.

### suit-pocket-patch.png
Close-up of a navy suit jacket with a patch pocket — a fabric patch sewn onto the outside of the jacket forming a visible square pocket. Clean white background, studio lighting, product detail shot. Square format, 1:1 aspect ratio.

---

## Shirt — Collar Style (4)

### shirt-collar-spread.png
Close-up of a white dress shirt collar in spread collar style — collar points angled wide apart leaving a broad opening. No tie. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### shirt-collar-button-down.png
Close-up of a white dress shirt collar in button-down style — small buttons fasten each collar point to the shirt front. No tie. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### shirt-collar-mandarin.png
Close-up of a white dress shirt with a mandarin collar — a short standing band collar with no fold or points. No tie. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### shirt-collar-cutaway.png
Close-up of a white dress shirt collar in cutaway style — collar points spread extremely wide, almost horizontal. No tie. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

---

## Shirt — Cuff Style (3)

### shirt-cuff-barrel.png
Close-up of a white dress shirt sleeve cuff in barrel style — a standard cuff fastened with one or two buttons. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### shirt-cuff-french.png
Close-up of a white dress shirt sleeve cuff in French cuff style — the cuff is folded back on itself and fastened with a silver cufflink. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### shirt-cuff-convertible.png
Close-up of a white dress shirt sleeve cuff in convertible style — shows both button holes for cufflinks and a button, can be worn either way. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

---

## Shirt — Placket Style (2)

### shirt-placket-standard.png
Close-up of a white dress shirt front showing a standard placket — a folded strip of fabric with visible buttons running down the center front. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### shirt-placket-french.png
Close-up of a white dress shirt front showing a French placket — buttons are hidden behind a clean, seamless fabric fold with no visible stitching. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

---

## Shirt — Pocket Style (2)

### shirt-pocket-none.png
Front view of a white dress shirt chest area showing a clean, smooth front with no pocket. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### shirt-pocket-chest.png
Front view of a white dress shirt with a single left chest pocket — a small square patch pocket on the left breast. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

---

## Shirt — Back Pleat (3)

### shirt-pleat-none.png
Back view of a white dress shirt showing a smooth, flat back with no pleats — fitted and slim. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### shirt-pleat-box.png
Back view of a white dress shirt showing a box pleat — a single wide fold at the center back below the yoke. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### shirt-pleat-side.png
Back view of a white dress shirt showing side pleats — two narrow folds, one on each side of the back near the shoulders. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

---

## Trousers — Fit Style (3)

### trouser-fit-slim.png
Side view of charcoal grey tailored trousers on a mannequin showing slim fit — tapered through the thigh and leg, narrow silhouette. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### trouser-fit-regular.png
Side view of charcoal grey tailored trousers on a mannequin showing regular fit — straight leg, comfortable room through hip and thigh. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### trouser-fit-relaxed.png
Side view of charcoal grey tailored trousers on a mannequin showing relaxed fit — generous room through hip, thigh, and leg. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

---

## Trousers — Pleat Style (3)

### trouser-pleat-flat.png
Close-up of the front waist area of charcoal grey trousers showing a flat front — smooth fabric with no pleats or folds. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### trouser-pleat-single.png
Close-up of the front waist area of charcoal grey trousers showing a single pleat — one fabric fold on each side near the waistband. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### trouser-pleat-double.png
Close-up of the front waist area of charcoal grey trousers showing double pleats — two fabric folds on each side near the waistband. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

---

## Trousers — Hem Style (3)

### trouser-hem-plain.png
Close-up of the bottom hem of charcoal grey trousers showing a plain hem — clean, straight finished edge with no cuff. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### trouser-hem-cuffed.png
Close-up of the bottom hem of charcoal grey trousers showing a cuffed hem — fabric folded up to create a visible horizontal band at the ankle. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### trouser-hem-tapered.png
Close-up of the bottom hem of charcoal grey trousers showing a tapered hem — the leg narrows significantly at the ankle for a modern slim finish. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

---

## Trousers — Pocket Style (2)

### trouser-pocket-slant.png
Close-up of the front pocket of charcoal grey trousers showing a slant pocket — the pocket opening is cut at a diagonal angle from the waistband. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### trouser-pocket-vertical.png
Close-up of the front pocket of charcoal grey trousers showing a vertical pocket — the pocket opening is a straight vertical slit along the side seam. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

---

## Trousers — Waistband Style (2)

### trouser-waistband-standard.png
Close-up of the waistband of charcoal grey trousers showing a standard waistband — classic band with visible belt loops and a button closure. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

### trouser-waistband-extended.png
Close-up of the waistband of charcoal grey trousers showing an extended waistband — the waistband extends past the button with a hook clasp closure, no belt loops. Clean white background, studio lighting. Square format, 1:1 aspect ratio.

---

## Upload Checklist

Total: 45 images (3 products + 42 options)

Suggested Supabase Storage structure:
```
product-images/
  products/
    product-two-piece-suit.png
    product-dress-shirt.png
    product-trousers.png
  suit/
    suit-lapel-notch.png
    suit-lapel-peak.png
    suit-lapel-shawl.png
    suit-button-one.png
    suit-button-two.png
    suit-button-three.png
    suit-vent-none.png
    suit-vent-single.png
    suit-vent-double.png
    suit-lining-full.png
    suit-lining-half.png
    suit-lining-unlined.png
    suit-pocket-flap.png
    suit-pocket-welt.png
    suit-pocket-patch.png
  shirt/
    shirt-collar-spread.png
    shirt-collar-button-down.png
    shirt-collar-mandarin.png
    shirt-collar-cutaway.png
    shirt-cuff-barrel.png
    shirt-cuff-french.png
    shirt-cuff-convertible.png
    shirt-placket-standard.png
    shirt-placket-french.png
    shirt-pocket-none.png
    shirt-pocket-chest.png
    shirt-pleat-none.png
    shirt-pleat-box.png
    shirt-pleat-side.png
  trousers/
    trouser-fit-slim.png
    trouser-fit-regular.png
    trouser-fit-relaxed.png
    trouser-pleat-flat.png
    trouser-pleat-single.png
    trouser-pleat-double.png
    trouser-hem-plain.png
    trouser-hem-cuffed.png
    trouser-hem-tapered.png
    trouser-pocket-slant.png
    trouser-pocket-vertical.png
    trouser-waistband-standard.png
    trouser-waistband-extended.png
```
