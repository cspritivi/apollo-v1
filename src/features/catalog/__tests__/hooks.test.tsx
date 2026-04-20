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

import { useFabrics, useProducts } from "../hooks";
import { fetchFabrics, fetchProducts } from "../api";

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
