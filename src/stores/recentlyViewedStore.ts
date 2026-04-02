/**
 * Recently Viewed Zustand store — tracks fabrics and products the customer
 * has viewed for easy re-discovery.
 *
 * WHY ZUSTAND (not React Query):
 * Recently viewed is client-owned browsing history, not server data. It
 * doesn't need caching, revalidation, or synchronization — just a local
 * ordered list that persists across app restarts.
 *
 * WHY LRU EVICTION:
 * Capped at 20 items to keep the store and AsyncStorage lean. When a new
 * view exceeds the cap, the least recently viewed item is dropped. Re-viewing
 * an item moves it to the front (deduplication) rather than creating a
 * duplicate entry.
 *
 * WHY STORE IDs + DISPLAY DATA (not full objects):
 * We store just enough to render a card (name, image, price) without
 * re-fetching. Full Fabric/Product objects would bloat storage. The
 * stored data is a snapshot — if catalog data changes, the card still
 * shows what the customer saw when they viewed it.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Maximum items to keep in the recently viewed list
const MAX_ITEMS = 20;

// ============================================================================
// TYPES
// ============================================================================

export interface RecentlyViewedItem {
  id: string;
  type: "fabric" | "product";
  name: string;
  imageUrl: string | null;
  /** Price in cents (base_price for products, price_per_meter for fabrics) */
  price: number;
  /** Unix timestamp (ms) when the item was last viewed */
  viewedAt: number;
}

/** The data needed to record a view — viewedAt is added automatically */
export type RecordViewInput = Omit<RecentlyViewedItem, "viewedAt">;

interface RecentlyViewedStore {
  items: RecentlyViewedItem[];
  addItem: (item: RecordViewInput) => void;
  clearAll: () => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set) => ({
      items: [],

      addItem: (input) =>
        set((state) => {
          // Remove existing entry if this item was already viewed (dedup)
          const filtered = state.items.filter((i) => i.id !== input.id);

          // Prepend the new/updated item with current timestamp
          const updated = [{ ...input, viewedAt: Date.now() }, ...filtered];

          // LRU eviction — drop items beyond the cap
          return { items: updated.slice(0, MAX_ITEMS) };
        }),

      clearAll: () => set({ items: [] }),
    }),
    {
      name: "recently-viewed-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
