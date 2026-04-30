/**
 * Configurator Snapshot store -- persisted, per-product configurator drafts.
 *
 * WHY A SEPARATE STORE (not extended `recentlyViewedStore`):
 * Snapshots are product-only and have a different lifecycle than recently
 * viewed entries (cleared on cart-add / order success vs. retained as
 * browsing history). Keeping them in their own store keeps the recently
 * viewed type small and the LRU/dedup logic uncluttered.
 *
 * WHY ID-ONLY SNAPSHOTS (not full objects):
 * The configurator already refetches `product`, `groupedOptions`, and the
 * fabric via React Query when the screen mounts. Storing IDs avoids
 * persisting stale catalog data and keeps AsyncStorage payloads tiny.
 *
 * WHY A `hasHydrated` STATE FLAG:
 * AsyncStorage rehydrates asynchronously, so a synchronous read of
 * `getSnapshot(id)` on first render can return undefined even when a
 * saved snapshot exists. Components that gate UI on snapshot presence
 * (the "In Progress" pill, the configurator restore decision) need to
 * subscribe reactively, which `useStore.persist.hasHydrated()` (a method,
 * not state) does not support. Exposing it as a state slice with
 * `onRehydrateStorage` lets components re-render when it flips.
 *
 * WHY LRU BY `savedAt` (not insertion order):
 * The on-disk shape is `Record<productId, ConfiguratorSnapshot>`. Plain
 * records do not guarantee insertion order across rehydrate (engine
 * behavior is consistent today but not part of the JSON contract), so
 * eviction by smallest `savedAt` is the deterministic choice.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Cap matches `recentlyViewedStore` -- twenty in-progress drafts is more
// than any realistic customer will accumulate, while keeping AsyncStorage
// payloads small.
export const MAX_SNAPSHOTS = 20;

// ============================================================================
// TYPES
// ============================================================================

export interface ConfiguratorSnapshot {
  /** ID of the fabric the customer had selected, or null if none. */
  fabricId: string | null;
  /** Map of option_group name -> selected option id. */
  selectedOptionIds: Record<string, string>;
  /** The step index the customer was on when they walked away. */
  currentStep: number;
  /** Free-text customer notes captured on the review step. */
  customerNotes: string;
  /** Unix ms at the moment of save. Drives LRU eviction. */
  savedAt: number;
}

interface ConfiguratorSnapshotStore {
  // State
  snapshots: Record<string, ConfiguratorSnapshot>;
  /** False until the persist middleware finishes rehydrating from disk. */
  hasHydrated: boolean;

  // Actions
  saveSnapshot: (productId: string, snapshot: ConfiguratorSnapshot) => void;
  getSnapshot: (productId: string) => ConfiguratorSnapshot | undefined;
  clearSnapshot: (productId: string) => void;
  clearAll: () => void;
  /** Internal -- called by persist's onRehydrateStorage. Not for app code. */
  _setHasHydrated: (value: boolean) => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useConfiguratorSnapshotStore = create<ConfiguratorSnapshotStore>()(
  persist(
    (set, get) => ({
      snapshots: {},
      hasHydrated: false,

      saveSnapshot: (productId, snapshot) =>
        set((state) => {
          const next: Record<string, ConfiguratorSnapshot> = {
            ...state.snapshots,
            [productId]: snapshot,
          };

          // Eviction only fires when adding a new key pushes us past the
          // cap. Overwriting an existing productId leaves the count
          // unchanged, so this branch is skipped.
          if (Object.keys(next).length > MAX_SNAPSHOTS) {
            let oldestId: string | null = null;
            let oldestSavedAt = Number.POSITIVE_INFINITY;
            for (const [id, snap] of Object.entries(next)) {
              if (snap.savedAt < oldestSavedAt) {
                oldestSavedAt = snap.savedAt;
                oldestId = id;
              }
            }
            if (oldestId !== null) {
              delete next[oldestId];
            }
          }

          return { snapshots: next };
        }),

      getSnapshot: (productId) => get().snapshots[productId],

      clearSnapshot: (productId) =>
        set((state) => {
          if (!(productId in state.snapshots)) return state;
          const next = { ...state.snapshots };
          delete next[productId];
          return { snapshots: next };
        }),

      clearAll: () => set({ snapshots: {} }),

      _setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "configurator-snapshot-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the data. `hasHydrated` is derived from the rehydrate
      // lifecycle and must always start false on cold launch.
      partialize: (state) => ({ snapshots: state.snapshots }),
      onRehydrateStorage: () => (rehydrated, error) => {
        // Flip the gate even on error -- consumers should not block
        // forever if storage is unreadable; they will see an empty map
        // and proceed as if no snapshots existed.
        if (error) {
          // No console here -- Sentry (#36) will pick this up once wired.
        }
        rehydrated?._setHasHydrated(true);
      },
    },
  ),
);
