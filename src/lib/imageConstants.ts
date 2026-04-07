/**
 * Shared constants for the AppImage component.
 *
 * WHY a single default blurhash instead of per-image hashes:
 * Storing a blurhash per fabric/product would require a DB schema change
 * (new column on fabrics and products tables) plus a server-side generation
 * step on image upload. A single neutral grey blurhash gives the visual
 * benefit of a smooth fade-in placeholder without that infrastructure.
 * When the image upload pipeline is built, replace DEFAULT_BLURHASH with
 * per-image values stored in the database.
 */

// Light grey blurhash — visually similar to the #f3f4f6 background
// used across all image placeholders in the app
export const DEFAULT_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

// Fade-in transition for images loading from network. 200ms is fast
// enough to feel responsive but slow enough to mask the placeholder-
// to-image swap on slow connections.
export const IMAGE_TRANSITION = { duration: 200 };
