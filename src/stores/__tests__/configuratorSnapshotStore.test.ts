/**
 * Tests for the configurator snapshot store.
 *
 * Covers: hydration gate (pre/post AsyncStorage rehydrate), save/get/clear,
 * LRU eviction by lowest savedAt at the 20-entry cap, and persistence shape
 * (partialize excludes hasHydrated so cold starts always begin un-hydrated).
 */

// Mock AsyncStorage before any store import -- persist middleware reads
// storage synchronously on module load.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useConfiguratorSnapshotStore,
  ConfiguratorSnapshot,
  MAX_SNAPSHOTS,
} from "../configuratorSnapshotStore";

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

const makeSnapshot = (
  overrides: Partial<ConfiguratorSnapshot> = {},
): ConfiguratorSnapshot => ({
  fabricId: "fab-1",
  selectedOptionIds: { collar: "spread" },
  currentStep: 0,
  customerNotes: "",
  savedAt: 1000,
  ...overrides,
});

beforeEach(() => {
  // Reset both store state and the AsyncStorage mock between tests.
  useConfiguratorSnapshotStore.setState({
    snapshots: {},
    hasHydrated: false,
  });
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

describe("configuratorSnapshotStore", () => {
  describe("hydration gate", () => {
    it("starts with hasHydrated=false", () => {
      // Synchronous read immediately after reset -- no rehydrate awaited.
      expect(useConfiguratorSnapshotStore.getState().hasHydrated).toBe(false);
    });

    it("flips hasHydrated to true after rehydrate completes", async () => {
      await useConfiguratorSnapshotStore.persist.rehydrate();
      expect(useConfiguratorSnapshotStore.getState().hasHydrated).toBe(true);
    });

    it("loads persisted snapshots on rehydrate", async () => {
      const persisted = {
        state: {
          snapshots: {
            "product-1": makeSnapshot({ savedAt: 1234 }),
          },
        },
        version: 0,
      };
      mockGetItem.mockResolvedValueOnce(JSON.stringify(persisted));

      await useConfiguratorSnapshotStore.persist.rehydrate();

      const restored =
        useConfiguratorSnapshotStore.getState().snapshots["product-1"];
      expect(restored).toBeDefined();
      expect(restored?.savedAt).toBe(1234);
    });
  });

  describe("saveSnapshot", () => {
    it("stores a snapshot keyed by productId", () => {
      useConfiguratorSnapshotStore
        .getState()
        .saveSnapshot("product-1", makeSnapshot());

      const stored =
        useConfiguratorSnapshotStore.getState().snapshots["product-1"];
      expect(stored).toBeDefined();
      expect(stored?.fabricId).toBe("fab-1");
    });

    it("overwrites the previous snapshot for the same productId", () => {
      const { saveSnapshot } = useConfiguratorSnapshotStore.getState();
      saveSnapshot("product-1", makeSnapshot({ fabricId: "fab-1" }));
      saveSnapshot(
        "product-1",
        makeSnapshot({ fabricId: "fab-2", savedAt: 2000 }),
      );

      const stored =
        useConfiguratorSnapshotStore.getState().snapshots["product-1"];
      expect(stored?.fabricId).toBe("fab-2");
      expect(stored?.savedAt).toBe(2000);
      expect(
        Object.keys(useConfiguratorSnapshotStore.getState().snapshots),
      ).toHaveLength(1);
    });
  });

  describe("getSnapshot", () => {
    it("returns the snapshot for a known productId", () => {
      useConfiguratorSnapshotStore
        .getState()
        .saveSnapshot("product-1", makeSnapshot());

      const snap = useConfiguratorSnapshotStore
        .getState()
        .getSnapshot("product-1");
      expect(snap?.fabricId).toBe("fab-1");
    });

    it("returns undefined for an unknown productId", () => {
      const snap = useConfiguratorSnapshotStore
        .getState()
        .getSnapshot("does-not-exist");
      expect(snap).toBeUndefined();
    });
  });

  describe("clearSnapshot", () => {
    it("removes the entry for the given productId", () => {
      const { saveSnapshot, clearSnapshot } =
        useConfiguratorSnapshotStore.getState();
      saveSnapshot("product-1", makeSnapshot());
      saveSnapshot("product-2", makeSnapshot());

      clearSnapshot("product-1");

      const snapshots = useConfiguratorSnapshotStore.getState().snapshots;
      expect(snapshots["product-1"]).toBeUndefined();
      expect(snapshots["product-2"]).toBeDefined();
    });

    it("is a no-op for an unknown productId", () => {
      useConfiguratorSnapshotStore
        .getState()
        .saveSnapshot("product-1", makeSnapshot());

      useConfiguratorSnapshotStore.getState().clearSnapshot("nope");

      expect(
        useConfiguratorSnapshotStore.getState().snapshots["product-1"],
      ).toBeDefined();
    });
  });

  describe("clearAll", () => {
    it("removes every snapshot", () => {
      const { saveSnapshot, clearAll } =
        useConfiguratorSnapshotStore.getState();
      saveSnapshot("product-1", makeSnapshot());
      saveSnapshot("product-2", makeSnapshot());

      clearAll();

      expect(
        Object.keys(useConfiguratorSnapshotStore.getState().snapshots),
      ).toHaveLength(0);
    });
  });

  describe("LRU eviction", () => {
    it("caps at MAX_SNAPSHOTS by evicting the lowest savedAt on overflow", () => {
      const { saveSnapshot } = useConfiguratorSnapshotStore.getState();

      // Fill to the cap, savedAt strictly increasing.
      for (let i = 1; i <= MAX_SNAPSHOTS; i++) {
        saveSnapshot(`product-${i}`, makeSnapshot({ savedAt: i }));
      }
      expect(
        Object.keys(useConfiguratorSnapshotStore.getState().snapshots),
      ).toHaveLength(MAX_SNAPSHOTS);

      // One more push past the cap -- should evict savedAt=1 (product-1).
      saveSnapshot(
        `product-${MAX_SNAPSHOTS + 1}`,
        makeSnapshot({ savedAt: MAX_SNAPSHOTS + 1 }),
      );

      const snapshots = useConfiguratorSnapshotStore.getState().snapshots;
      expect(Object.keys(snapshots)).toHaveLength(MAX_SNAPSHOTS);
      expect(snapshots["product-1"]).toBeUndefined();
      expect(snapshots[`product-${MAX_SNAPSHOTS + 1}`]).toBeDefined();
    });

    it("does not evict when overwriting an existing productId at the cap", () => {
      const { saveSnapshot } = useConfiguratorSnapshotStore.getState();

      for (let i = 1; i <= MAX_SNAPSHOTS; i++) {
        saveSnapshot(`product-${i}`, makeSnapshot({ savedAt: i }));
      }

      // Overwrite product-1 -- count stays at MAX_SNAPSHOTS, no eviction.
      saveSnapshot(
        "product-1",
        makeSnapshot({ savedAt: 9999, fabricId: "fab-updated" }),
      );

      const snapshots = useConfiguratorSnapshotStore.getState().snapshots;
      expect(Object.keys(snapshots)).toHaveLength(MAX_SNAPSHOTS);
      expect(snapshots["product-1"]?.fabricId).toBe("fab-updated");
      // The previously-lowest non-overwritten savedAt was product-2 -- still here.
      expect(snapshots["product-2"]).toBeDefined();
    });
  });

  describe("persistence shape", () => {
    it("only persists the snapshots map, not hasHydrated", async () => {
      useConfiguratorSnapshotStore
        .getState()
        .saveSnapshot("product-1", makeSnapshot());

      // Persist middleware writes asynchronously after state changes -- flush
      // microtasks so the setItem call lands.
      await Promise.resolve();
      await Promise.resolve();

      expect(mockSetItem).toHaveBeenCalled();
      const lastCall =
        mockSetItem.mock.calls[mockSetItem.mock.calls.length - 1];
      const [, payload] = lastCall;
      const parsed = JSON.parse(payload);
      expect(parsed.state.snapshots).toBeDefined();
      expect(parsed.state.hasHydrated).toBeUndefined();
    });
  });
});
