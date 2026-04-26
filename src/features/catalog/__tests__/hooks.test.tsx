/**
 * Tests for catalog React Query hooks.
 *
 * WHY THESE TESTS EXIST:
 * The primary fix being validated here is the `enabled` guard that prevents
 * catalog queries from firing before the auth session is available. Without
 * this guard, Supabase RLS returns empty arrays (not errors) for
 * unauthenticated requests, and React Query caches that empty result for
 * the full staleTime window — causing the fabric/product tabs to appear
 * empty on cold start.
 *
 * APPROACH: Mock the API module (not Supabase) and use renderHook with a
 * QueryClient wrapper, following the same pattern as alterations/hooks.test.tsx.
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ============================================================================
// MOCK API MODULE
// ============================================================================

jest.mock("../api", () => ({
  fetchFabrics: jest.fn(),
  fetchFabricById: jest.fn(),
  fetchSavedFabrics: jest.fn(),
  saveFabric: jest.fn(),
  unsaveFabric: jest.fn(),
  fetchProducts: jest.fn(),
  fetchProductById: jest.fn(),
  fetchProductOptions: jest.fn(),
}));

import {
  useFabrics,
  useFabric,
  useSavedFabrics,
  useSaveFabric,
  useUnsaveFabric,
  useProducts,
  useProduct,
  useProductOptions,
} from "../hooks";
import {
  fetchFabrics,
  fetchFabricById,
  fetchSavedFabrics,
  saveFabric,
  unsaveFabric,
  fetchProducts,
  fetchProductById,
  fetchProductOptions,
} from "../api";

// ============================================================================
// TEST UTILITIES
// ============================================================================

const mockFabric = {
  id: "fabric-1",
  name: "Black Wool Crepe",
  description: "A fine wool crepe fabric",
  image_url: "https://example.com/fabric.jpg",
  price_per_meter: 4500,
  color_tags: ["black"],
  available: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockProduct = {
  id: "product-1",
  name: "Two-Piece Suit",
  description: "A classic two-piece suit",
  image_url: "https://example.com/suit.jpg",
  base_price: 25000,
  option_groups: ["collar_style", "lining_color"],
  available: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockSavedFabric = {
  id: "saved-1",
  user_id: "user-1",
  fabric_id: "fabric-1",
  created_at: "2026-01-01T00:00:00Z",
};

const makeOption = (id: string, group: string, name: string) => ({
  id,
  product_id: "product-1",
  option_group: group,
  name,
  description: null,
  image_url: null,
  price_modifier: 0,
  available: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

const mockOptions = [
  makeOption("opt-1", "collar_style", "Spread"),
  makeOption("opt-2", "collar_style", "Mandarin"),
  makeOption("opt-3", "lining_color", "Navy"),
];

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { queryClient, wrapper };
}

// ============================================================================
// useFabrics TESTS
// ============================================================================

describe("useFabrics", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches fabrics when enabled is true", async () => {
    (fetchFabrics as jest.Mock).mockResolvedValue([mockFabric]);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(
      () => useFabrics({ availableOnly: true, enabled: true }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchFabrics).toHaveBeenCalledWith({
      availableOnly: true,
      enabled: true,
    });
    expect(result.current.data).toEqual([mockFabric]);
  });

  it("does not fetch when enabled is false (session not ready)", () => {
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(
      () => useFabrics({ availableOnly: true, enabled: false }),
      { wrapper },
    );

    // Query should remain idle — never fires without a valid session
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchFabrics).not.toHaveBeenCalled();
  });

  it("fetches fabrics when enabled is omitted (defaults to true)", async () => {
    (fetchFabrics as jest.Mock).mockResolvedValue([mockFabric]);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useFabrics({ availableOnly: true }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchFabrics).toHaveBeenCalled();
  });

  it("fires query when enabled transitions from false to true", async () => {
    (fetchFabrics as jest.Mock).mockResolvedValue([mockFabric]);
    const { wrapper } = createTestWrapper();

    // Start with enabled: false (simulating session not yet loaded)
    let enabled = false;
    const { result, rerender } = renderHook(
      () => useFabrics({ availableOnly: true, enabled }),
      { wrapper },
    );

    // Should be idle initially
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchFabrics).not.toHaveBeenCalled();

    // Session arrives — enabled becomes true
    enabled = true;
    rerender({});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchFabrics).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([mockFabric]);
  });
});

// ============================================================================
// useProducts TESTS
// ============================================================================

describe("useProducts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches products when enabled is true", async () => {
    (fetchProducts as jest.Mock).mockResolvedValue([mockProduct]);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useProducts({ enabled: true }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProducts).toHaveBeenCalled();
    expect(result.current.data).toEqual([mockProduct]);
  });

  it("does not fetch when enabled is false (session not ready)", () => {
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useProducts({ enabled: false }), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchProducts).not.toHaveBeenCalled();
  });

  it("fetches products when no options passed (defaults to enabled)", async () => {
    (fetchProducts as jest.Mock).mockResolvedValue([mockProduct]);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProducts).toHaveBeenCalled();
  });

  it("fires query when enabled transitions from false to true", async () => {
    (fetchProducts as jest.Mock).mockResolvedValue([mockProduct]);
    const { wrapper } = createTestWrapper();

    let enabled = false;
    const { result, rerender } = renderHook(() => useProducts({ enabled }), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchProducts).not.toHaveBeenCalled();

    enabled = true;
    rerender({});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProducts).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([mockProduct]);
  });
});

// ============================================================================
// useFabric TESTS
// ============================================================================

describe("useFabric", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches a fabric when id is provided", async () => {
    (fetchFabricById as jest.Mock).mockResolvedValue(mockFabric);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useFabric("fabric-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchFabricById).toHaveBeenCalledWith("fabric-1");
    expect(result.current.data).toEqual(mockFabric);
  });

  it("does not fetch when id is undefined", () => {
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useFabric(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchFabricById).not.toHaveBeenCalled();
  });
});

// ============================================================================
// useSavedFabrics TESTS
// ============================================================================

describe("useSavedFabrics", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches saved fabrics when userId is provided", async () => {
    (fetchSavedFabrics as jest.Mock).mockResolvedValue([mockSavedFabric]);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useSavedFabrics("user-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSavedFabrics).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toEqual([mockSavedFabric]);
  });

  it("does not fetch when userId is undefined", () => {
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useSavedFabrics(undefined), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchSavedFabrics).not.toHaveBeenCalled();
  });
});

// ============================================================================
// useSaveFabric TESTS
//
// These cover the optimistic-update flow: onMutate adds an entry to the cache
// before the server responds, and onError rolls back to the pre-mutation
// snapshot if the server call fails.
// ============================================================================

describe("useSaveFabric", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls saveFabric and optimistically adds to cache on success", async () => {
    (saveFabric as jest.Mock).mockResolvedValue({
      ...mockSavedFabric,
      id: "saved-2",
      fabric_id: "fabric-2",
    });
    const { queryClient, wrapper } = createTestWrapper();
    queryClient.setQueryData(["saved_fabrics", "user-1"], [mockSavedFabric]);

    const { result } = renderHook(() => useSaveFabric("user-1"), { wrapper });

    result.current.mutate("fabric-2");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(saveFabric).toHaveBeenCalledWith("user-1", "fabric-2");

    // After success the cache holds the original entry plus the optimistic entry.
    // onSettled invalidates but does not refetch (no active subscriber here).
    const cached = queryClient.getQueryData([
      "saved_fabrics",
      "user-1",
    ]) as Array<typeof mockSavedFabric>;
    expect(cached).toHaveLength(2);
    expect(cached.some((s) => s.fabric_id === "fabric-2")).toBe(true);
  });

  it("rolls back cache on server error", async () => {
    (saveFabric as jest.Mock).mockRejectedValue(new Error("RLS denied"));
    const { queryClient, wrapper } = createTestWrapper();
    const initialCache = [mockSavedFabric];
    queryClient.setQueryData(["saved_fabrics", "user-1"], initialCache);

    const { result } = renderHook(() => useSaveFabric("user-1"), { wrapper });

    result.current.mutate("fabric-2");

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData([
      "saved_fabrics",
      "user-1",
    ]) as Array<typeof mockSavedFabric>;
    expect(cached).toEqual(initialCache);
  });
});

// ============================================================================
// useUnsaveFabric TESTS
//
// Mirror of useSaveFabric: onMutate removes the entry, onError restores it.
// ============================================================================

describe("useUnsaveFabric", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls unsaveFabric and optimistically removes from cache on success", async () => {
    (unsaveFabric as jest.Mock).mockResolvedValue(undefined);
    const { queryClient, wrapper } = createTestWrapper();
    queryClient.setQueryData(["saved_fabrics", "user-1"], [mockSavedFabric]);

    const { result } = renderHook(() => useUnsaveFabric("user-1"), { wrapper });

    result.current.mutate("fabric-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(unsaveFabric).toHaveBeenCalledWith("user-1", "fabric-1");

    const cached = queryClient.getQueryData([
      "saved_fabrics",
      "user-1",
    ]) as Array<typeof mockSavedFabric>;
    expect(cached).toEqual([]);
  });

  it("rolls back cache on server error", async () => {
    (unsaveFabric as jest.Mock).mockRejectedValue(new Error("network"));
    const { queryClient, wrapper } = createTestWrapper();
    const initialCache = [mockSavedFabric];
    queryClient.setQueryData(["saved_fabrics", "user-1"], initialCache);

    const { result } = renderHook(() => useUnsaveFabric("user-1"), { wrapper });

    result.current.mutate("fabric-1");

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData([
      "saved_fabrics",
      "user-1",
    ]) as Array<typeof mockSavedFabric>;
    expect(cached).toEqual(initialCache);
  });
});

// ============================================================================
// useProduct TESTS
// ============================================================================

describe("useProduct", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches a product when id is provided", async () => {
    (fetchProductById as jest.Mock).mockResolvedValue(mockProduct);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useProduct("product-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductById).toHaveBeenCalledWith("product-1");
    expect(result.current.data).toEqual(mockProduct);
  });

  it("does not fetch when id is undefined", () => {
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useProduct(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchProductById).not.toHaveBeenCalled();
  });
});

// ============================================================================
// useProductOptions TESTS
//
// Exercises the `select` transform that groups the flat option array into
// a Record<option_group, options[]> for the configurator UI.
// ============================================================================

describe("useProductOptions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches and groups options by option_group", async () => {
    (fetchProductOptions as jest.Mock).mockResolvedValue(mockOptions);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useProductOptions("product-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductOptions).toHaveBeenCalledWith("product-1");
    expect(result.current.data).toEqual({
      collar_style: [mockOptions[0], mockOptions[1]],
      lining_color: [mockOptions[2]],
    });
  });

  it("does not fetch when productId is undefined", () => {
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useProductOptions(undefined), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchProductOptions).not.toHaveBeenCalled();
  });
});
