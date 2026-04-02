/**
 * Tests for the recently viewed items Zustand store.
 *
 * Covers: adding items, LRU eviction, deduplication (moves to front),
 * separate tracking for fabrics and products, and the max items cap.
 */

// Mock AsyncStorage before any store import — the persist middleware
// initializes storage on module load
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { useRecentlyViewedStore } from "../recentlyViewedStore";

// Reset store state before each test
beforeEach(() => {
  useRecentlyViewedStore.setState({ items: [] });
});

describe("recentlyViewedStore", () => {
  describe("addItem", () => {
    it("adds a fabric to the recently viewed list", () => {
      useRecentlyViewedStore.getState().addItem({
        id: "fabric-1",
        type: "fabric",
        name: "Black Wool Crepe",
        imageUrl: "https://example.com/fabric1.jpg",
        price: 4500,
      });

      const items = useRecentlyViewedStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("fabric-1");
      expect(items[0].type).toBe("fabric");
    });

    it("adds a product to the recently viewed list", () => {
      useRecentlyViewedStore.getState().addItem({
        id: "product-1",
        type: "product",
        name: "Classic Suit",
        imageUrl: "https://example.com/suit.jpg",
        price: 49900,
      });

      const items = useRecentlyViewedStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("product-1");
      expect(items[0].type).toBe("product");
    });

    it("records a timestamp on each view", () => {
      const before = Date.now();
      useRecentlyViewedStore.getState().addItem({
        id: "fabric-1",
        type: "fabric",
        name: "Black Wool Crepe",
        imageUrl: null,
        price: 4500,
      });
      const after = Date.now();

      const item = useRecentlyViewedStore.getState().items[0];
      expect(item.viewedAt).toBeGreaterThanOrEqual(before);
      expect(item.viewedAt).toBeLessThanOrEqual(after);
    });
  });

  describe("ordering", () => {
    it("places most recently viewed items first", () => {
      const { addItem } = useRecentlyViewedStore.getState();
      addItem({
        id: "f1",
        type: "fabric",
        name: "First",
        imageUrl: null,
        price: 100,
      });
      addItem({
        id: "f2",
        type: "fabric",
        name: "Second",
        imageUrl: null,
        price: 200,
      });

      const items = useRecentlyViewedStore.getState().items;
      expect(items[0].id).toBe("f2");
      expect(items[1].id).toBe("f1");
    });
  });

  describe("deduplication", () => {
    it("moves an existing item to the front instead of creating a duplicate", () => {
      const { addItem } = useRecentlyViewedStore.getState();
      addItem({
        id: "f1",
        type: "fabric",
        name: "First",
        imageUrl: null,
        price: 100,
      });
      addItem({
        id: "f2",
        type: "fabric",
        name: "Second",
        imageUrl: null,
        price: 200,
      });
      // Re-view the first item
      addItem({
        id: "f1",
        type: "fabric",
        name: "First",
        imageUrl: null,
        price: 100,
      });

      const items = useRecentlyViewedStore.getState().items;
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe("f1");
      expect(items[1].id).toBe("f2");
    });

    it("updates the timestamp when re-viewing", () => {
      const { addItem } = useRecentlyViewedStore.getState();
      addItem({
        id: "f1",
        type: "fabric",
        name: "First",
        imageUrl: null,
        price: 100,
      });
      const firstViewedAt = useRecentlyViewedStore.getState().items[0].viewedAt;

      // Small delay to ensure different timestamp
      const laterTimestamp = firstViewedAt + 1000;
      jest.spyOn(Date, "now").mockReturnValue(laterTimestamp);

      addItem({
        id: "f1",
        type: "fabric",
        name: "First",
        imageUrl: null,
        price: 100,
      });

      const updatedItem = useRecentlyViewedStore.getState().items[0];
      expect(updatedItem.viewedAt).toBe(laterTimestamp);

      jest.restoreAllMocks();
    });
  });

  describe("LRU eviction", () => {
    it("evicts the oldest item when the list exceeds the max", () => {
      const { addItem } = useRecentlyViewedStore.getState();

      // Add 21 items — the max is 20, so the oldest should be evicted
      for (let i = 1; i <= 21; i++) {
        addItem({
          id: `f${i}`,
          type: "fabric",
          name: `Fabric ${i}`,
          imageUrl: null,
          price: i * 100,
        });
      }

      const items = useRecentlyViewedStore.getState().items;
      expect(items).toHaveLength(20);
      // The first item added (f1) should be evicted
      expect(items.find((item) => item.id === "f1")).toBeUndefined();
      // The most recent (f21) should be first
      expect(items[0].id).toBe("f21");
    });
  });

  describe("clearAll", () => {
    it("removes all recently viewed items", () => {
      const { addItem } = useRecentlyViewedStore.getState();
      addItem({
        id: "f1",
        type: "fabric",
        name: "First",
        imageUrl: null,
        price: 100,
      });
      addItem({
        id: "p1",
        type: "product",
        name: "Suit",
        imageUrl: null,
        price: 49900,
      });

      useRecentlyViewedStore.getState().clearAll();
      expect(useRecentlyViewedStore.getState().items).toHaveLength(0);
    });
  });
});
