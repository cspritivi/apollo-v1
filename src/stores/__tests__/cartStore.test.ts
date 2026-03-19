/**
 * TDD tests for the cart Zustand store.
 *
 * The cart holds configured items client-side until the customer checks out.
 * Each item is a snapshot of a product + fabric + options at add-time, with
 * a pre-calculated price to prevent drift from the configurator review.
 *
 * Tests written BEFORE implementation (TDD red phase).
 */

// Mock AsyncStorage before any store import — the persist middleware
// initializes storage on module load
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { Product, Fabric, ProductOption } from "../../types";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockProduct: Product = {
  id: "prod-1",
  name: "Two-Piece Suit",
  description: "A classic suit",
  base_price: 20000, // $200
  image_url: "https://example.com/suit.jpg",
  option_groups: ["lapel_style", "vent_style"],
  fabric_meters: 3.5,
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockShirtProduct: Product = {
  id: "prod-2",
  name: "Dress Shirt",
  description: "A dress shirt",
  base_price: 5000, // $50
  image_url: "https://example.com/shirt.jpg",
  option_groups: ["collar_style", "cuff_style"],
  fabric_meters: 2.5,
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockFabric: Fabric = {
  id: "fab-1",
  name: "Black Wool Crepe",
  description: "Premium wool",
  image_url: "https://example.com/wool.jpg",
  price_per_meter: 3000, // $30/m
  color_tags: ["black"],
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const makeOption = (group: string, modifier: number): ProductOption => ({
  id: `opt-${group}`,
  product_id: "prod-1",
  option_group: group,
  name: `${group} option`,
  description: null,
  image_url: null,
  price_modifier: modifier,
  available: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
});

// ============================================================================
// TESTS
// ============================================================================

// Import after fixtures so the module-level store is created fresh
// We need to import dynamically or reset between tests
let useCartStore: typeof import("../cartStore").useCartStore;

beforeEach(() => {
  // Reset module registry so each test gets a fresh store
  jest.resetModules();
  useCartStore = require("../cartStore").useCartStore;
});

describe("cartStore", () => {
  describe("initial state", () => {
    it("starts with an empty items array", () => {
      const { items } = useCartStore.getState();
      expect(items).toEqual([]);
    });

    it("totalPrice returns 0 when empty", () => {
      const { totalPrice } = useCartStore.getState();
      expect(totalPrice()).toBe(0);
    });

    it("itemCount returns 0 when empty", () => {
      const { itemCount } = useCartStore.getState();
      expect(itemCount()).toBe(0);
    });
  });

  describe("addItem", () => {
    it("adds an item with auto-generated id and addedAt timestamp", () => {
      const { addItem } = useCartStore.getState();
      const options: Record<string, ProductOption> = {
        lapel_style: makeOption("lapel_style", 0),
        vent_style: makeOption("vent_style", 1500),
      };

      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: options,
        customerNotes: "Rush please",
      });

      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);

      const item = items[0];
      // Auto-generated fields
      expect(item.id).toBeDefined();
      expect(typeof item.id).toBe("string");
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.addedAt).toBeDefined();

      // Passed-through fields
      expect(item.product).toEqual(mockProduct);
      expect(item.fabric).toEqual(mockFabric);
      expect(item.selectedOptions).toEqual(options);
      expect(item.customerNotes).toBe("Rush please");
    });

    it("calculates price using calculatePrice formula", () => {
      const { addItem } = useCartStore.getState();
      const options: Record<string, ProductOption> = {
        lapel_style: makeOption("lapel_style", 0),
        vent_style: makeOption("vent_style", 1500), // +$15
      };

      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: options,
        customerNotes: "",
      });

      const { items } = useCartStore.getState();
      // $200 base + ($30/m × 3.5m = $105 fabric) + $15 modifier = $320
      expect(items[0].price).toBe(32000);
    });

    it("accumulates multiple items in the array", () => {
      const { addItem } = useCartStore.getState();

      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: { lapel_style: makeOption("lapel_style", 0) },
        customerNotes: "",
      });

      addItem({
        product: mockShirtProduct,
        fabric: mockFabric,
        selectedOptions: { collar_style: makeOption("collar_style", 0) },
        customerNotes: "",
      });

      const { items } = useCartStore.getState();
      expect(items).toHaveLength(2);
      expect(items[0].product.name).toBe("Two-Piece Suit");
      expect(items[1].product.name).toBe("Dress Shirt");
    });

    it("creates separate cart items for same product+fabric+options (no merging)", () => {
      // In bespoke tailoring each configured item is unique — even two
      // identical suits are separate garments with separate timelines
      const { addItem } = useCartStore.getState();
      const options = { lapel_style: makeOption("lapel_style", 0) };

      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: options,
        customerNotes: "",
      });

      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: options,
        customerNotes: "",
      });

      const { items } = useCartStore.getState();
      expect(items).toHaveLength(2);
      // Different IDs despite identical configuration
      expect(items[0].id).not.toBe(items[1].id);
    });
  });

  describe("removeItem", () => {
    it("removes item by id", () => {
      const { addItem } = useCartStore.getState();

      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: {},
        customerNotes: "",
      });

      const { items, removeItem } = useCartStore.getState();
      expect(items).toHaveLength(1);

      removeItem(items[0].id);

      const updated = useCartStore.getState().items;
      expect(updated).toHaveLength(0);
    });

    it("is a no-op if id does not exist", () => {
      const { addItem } = useCartStore.getState();

      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: {},
        customerNotes: "",
      });

      const { removeItem } = useCartStore.getState();
      removeItem("nonexistent-id");

      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
    });

    it("leaves other items unaffected", () => {
      const { addItem } = useCartStore.getState();

      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: {},
        customerNotes: "",
      });

      addItem({
        product: mockShirtProduct,
        fabric: mockFabric,
        selectedOptions: {},
        customerNotes: "",
      });

      const { items, removeItem } = useCartStore.getState();
      removeItem(items[0].id);

      const updated = useCartStore.getState().items;
      expect(updated).toHaveLength(1);
      expect(updated[0].product.name).toBe("Dress Shirt");
    });
  });

  describe("clearCart", () => {
    it("empties the items array", () => {
      const { addItem } = useCartStore.getState();

      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: {},
        customerNotes: "",
      });

      addItem({
        product: mockShirtProduct,
        fabric: mockFabric,
        selectedOptions: {},
        customerNotes: "",
      });

      const { clearCart } = useCartStore.getState();
      clearCart();

      const { items } = useCartStore.getState();
      expect(items).toHaveLength(0);
    });

    it("resets totalPrice to 0", () => {
      const { addItem } = useCartStore.getState();

      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: {},
        customerNotes: "",
      });

      const { clearCart } = useCartStore.getState();
      clearCart();

      const { totalPrice } = useCartStore.getState();
      expect(totalPrice()).toBe(0);
    });
  });

  describe("totalPrice", () => {
    it("returns sum of all item prices", () => {
      const { addItem } = useCartStore.getState();

      // Suit: $200 + ($30 × 3.5 = $105) = $305
      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: {},
        customerNotes: "",
      });

      // Shirt: $50 + ($30 × 2.5 = $75) = $125
      addItem({
        product: mockShirtProduct,
        fabric: mockFabric,
        selectedOptions: {},
        customerNotes: "",
      });

      const { totalPrice } = useCartStore.getState();
      expect(totalPrice()).toBe(30500 + 12500);
    });

    it("is correct with mixed positive and negative option modifiers", () => {
      const { addItem } = useCartStore.getState();

      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: {
          lapel_style: makeOption("lapel_style", 2000), // +$20
          vent_style: makeOption("vent_style", -500), // -$5
        },
        customerNotes: "",
      });

      const { totalPrice } = useCartStore.getState();
      // $200 + $105 fabric + $20 - $5 = $320
      expect(totalPrice()).toBe(32000);
    });
  });

  describe("itemCount", () => {
    it("returns items.length", () => {
      const { addItem } = useCartStore.getState();

      addItem({
        product: mockProduct,
        fabric: mockFabric,
        selectedOptions: {},
        customerNotes: "",
      });

      addItem({
        product: mockShirtProduct,
        fabric: mockFabric,
        selectedOptions: {},
        customerNotes: "",
      });

      const { itemCount } = useCartStore.getState();
      expect(itemCount()).toBe(2);
    });
  });
});
