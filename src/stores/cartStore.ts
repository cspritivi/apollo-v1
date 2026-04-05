/**
 * Cart Zustand store — holds configured items client-side until checkout.
 *
 * WHY ZUSTAND (not React Query or Context):
 * The cart is client-owned state, not server data. It doesn't come from Supabase
 * and doesn't need caching/revalidation. Zustand gives us a simple global store
 * that any component can read without prop drilling or context nesting.
 *
 * WHY PERSIST MIDDLEWARE:
 * Cart survives app restarts via AsyncStorage. Losing a carefully configured
 * bespoke suit because the app was backgrounded is unacceptable UX. Future
 * improvement: move persistence to Supabase for cross-device sync.
 *
 * WHY FULL OBJECTS (not just IDs):
 * Cart items need to display product name, fabric name, images, and prices
 * without re-fetching from Supabase. Storing full objects at add-time also acts
 * as a snapshot — if the catalog changes while items are in the cart, the
 * customer sees what they selected, not the updated catalog.
 *
 * WHY PRE-CALCULATED PRICE:
 * The price shown in the cart must exactly match what was shown on the
 * configurator review screen. Calculating at add-time via the shared
 * calculatePrice utility eliminates any risk of drift.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product, Fabric, ProductOption } from "@/types";
import { calculatePrice } from "@/features/orders/utils/calculatePrice";

// ============================================================================
// TYPES
// ============================================================================

export interface CartItem {
  id: string; // Client-side UUID for identification
  product: Product; // Full product snapshot at add-time
  fabric: Fabric; // Full fabric snapshot at add-time
  selectedOptions: Record<string, ProductOption>;
  customerNotes: string;
  price: number; // Pre-calculated total in cents (integer)
  addedAt: string; // ISO 8601 timestamp
}

interface CartStore {
  // State
  items: CartItem[];

  // Actions
  addItem: (item: Omit<CartItem, "id" | "addedAt" | "price">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;

  // Computed — functions rather than getters because Zustand doesn't
  // support derived state natively. Calling these reads current state.
  totalPrice: () => number;
  itemCount: () => number;
}

// ============================================================================
// STORE
// ============================================================================

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...item,
              id: generateId(),
              addedAt: new Date().toISOString(),
              // Price calculated once at add-time using the shared formula
              price: calculatePrice(
                item.product.base_price,
                item.fabric.price_per_meter,
                item.product.fabric_meters,
                item.selectedOptions,
              ),
            },
          ],
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      clearCart: () => set({ items: [] }),

      totalPrice: () => get().items.reduce((sum, item) => sum + item.price, 0),

      itemCount: () => get().items.length,
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the items array — computed functions are recreated
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

/**
 * Generate a unique ID for cart items.
 * Uses crypto.randomUUID when available (modern runtimes), falls back to
 * a timestamp + random suffix for environments without it.
 */
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random suffix — unique enough for client-side cart IDs
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
