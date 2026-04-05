/**
 * Tests for alterations React Query hooks.
 *
 * WHY TEST HOOKS SEPARATELY FROM API:
 * The API tests verify Supabase query construction. These tests verify
 * React Query configuration: cache keys, enabled flags, stale times,
 * and cache invalidation on mutations. If we only tested the API layer,
 * a misconfigured hook (wrong query key, missing enabled guard) would
 * slip through and cause subtle bugs like stale data or unnecessary
 * refetches.
 *
 * APPROACH: Mock the API module (not Supabase) so we test the hooks'
 * React Query wiring in isolation. Uses renderHook with a QueryClient
 * wrapper to provide the React Query context.
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { AlterationStatus } from "@/types";

// ============================================================================
// MOCK API MODULE
// ============================================================================

/**
 * WHY MOCK API (not Supabase):
 * Hooks tests should verify how hooks USE the API functions — query keys,
 * caching behavior, invalidation. Mocking at the API boundary gives us
 * clean control over return values without re-mocking Supabase's chained
 * builder for every scenario.
 */
jest.mock("../api", () => ({
  fetchAlterationsByOrder: jest.fn(),
  fetchAlterationsByProfile: jest.fn(),
  fetchAlterationById: jest.fn(),
  createAlteration: jest.fn(),
}));

import {
  useAlterationsByOrder,
  useAlterationsByProfile,
  useAlteration,
  useCreateAlteration,
} from "../hooks";

import {
  fetchAlterationsByOrder,
  fetchAlterationsByProfile,
  fetchAlterationById,
  createAlteration,
} from "../api";

// ============================================================================
// TEST UTILITIES
// ============================================================================

const mockAlteration = {
  id: "alt-1",
  order_id: "order-123",
  profile_id: "user-456",
  description: "Take in waist by 1 inch",
  status: AlterationStatus.REQUESTED,
  charge_amount: 2500,
  image_urls: null,
  customer_notes: null,
  internal_notes: null,
  created_at: "2026-03-28T00:00:00Z",
  updated_at: "2026-03-28T00:00:00Z",
  completed_at: null,
};

/**
 * Create a fresh QueryClient + wrapper for each test.
 * Disabling retries prevents flaky async behavior in tests.
 */
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
// useAlterationsByOrder TESTS
// ============================================================================

describe("useAlterationsByOrder", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches alterations when orderId is provided", async () => {
    (fetchAlterationsByOrder as jest.Mock).mockResolvedValue([mockAlteration]);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useAlterationsByOrder("order-123"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAlterationsByOrder).toHaveBeenCalledWith("order-123");
    expect(result.current.data).toEqual([mockAlteration]);
  });

  it("does not fetch when orderId is undefined (enabled guard)", async () => {
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useAlterationsByOrder(undefined), {
      wrapper,
    });

    // Should remain idle — never fires the query
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchAlterationsByOrder).not.toHaveBeenCalled();
  });

  it("uses correct query key for cache isolation", async () => {
    (fetchAlterationsByOrder as jest.Mock).mockResolvedValue([]);
    const { queryClient, wrapper } = createTestWrapper();

    renderHook(() => useAlterationsByOrder("order-123"), { wrapper });

    await waitFor(() =>
      expect(
        queryClient.getQueryState(["alterations", "by-order", "order-123"]),
      ).toBeDefined(),
    );
  });
});

// ============================================================================
// useAlterationsByProfile TESTS
// ============================================================================

describe("useAlterationsByProfile", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches alterations when profileId is provided", async () => {
    (fetchAlterationsByProfile as jest.Mock).mockResolvedValue([
      mockAlteration,
    ]);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useAlterationsByProfile("user-456"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAlterationsByProfile).toHaveBeenCalledWith("user-456");
    expect(result.current.data).toEqual([mockAlteration]);
  });

  it("does not fetch when profileId is undefined", async () => {
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useAlterationsByProfile(undefined), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchAlterationsByProfile).not.toHaveBeenCalled();
  });

  it("uses correct query key for cache isolation", async () => {
    (fetchAlterationsByProfile as jest.Mock).mockResolvedValue([]);
    const { queryClient, wrapper } = createTestWrapper();

    renderHook(() => useAlterationsByProfile("user-456"), { wrapper });

    await waitFor(() =>
      expect(
        queryClient.getQueryState(["alterations", "by-profile", "user-456"]),
      ).toBeDefined(),
    );
  });
});

// ============================================================================
// useAlteration TESTS
// ============================================================================

describe("useAlteration", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches a single alteration by ID", async () => {
    (fetchAlterationById as jest.Mock).mockResolvedValue(mockAlteration);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useAlteration("alt-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAlterationById).toHaveBeenCalledWith("alt-1");
    expect(result.current.data).toEqual(mockAlteration);
  });

  it("does not fetch when alterationId is undefined", async () => {
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useAlteration(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchAlterationById).not.toHaveBeenCalled();
  });

  it("uses correct query key", async () => {
    (fetchAlterationById as jest.Mock).mockResolvedValue(mockAlteration);
    const { queryClient, wrapper } = createTestWrapper();

    renderHook(() => useAlteration("alt-1"), { wrapper });

    await waitFor(() =>
      expect(
        queryClient.getQueryState(["alterations", "detail", "alt-1"]),
      ).toBeDefined(),
    );
  });
});

// ============================================================================
// useCreateAlteration TESTS
// ============================================================================

describe("useCreateAlteration", () => {
  beforeEach(() => jest.clearAllMocks());

  const mutationInput = {
    orderId: "order-123",
    profileId: "user-456",
    description: "Take in waist by 1 inch",
    chargeAmount: 2500,
  };

  it("calls createAlteration with the input", async () => {
    (createAlteration as jest.Mock).mockResolvedValue(mockAlteration);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useCreateAlteration(), { wrapper });

    result.current.mutate(mutationInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createAlteration).toHaveBeenCalledWith(mutationInput);
  });

  it("invalidates by-order cache on success", async () => {
    (createAlteration as jest.Mock).mockResolvedValue(mockAlteration);
    const { queryClient, wrapper } = createTestWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateAlteration(), { wrapper });

    result.current.mutate(mutationInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should invalidate the order-specific alteration list
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["alterations", "by-order", "order-123"],
      }),
    );
  });

  it("invalidates by-profile cache on success", async () => {
    (createAlteration as jest.Mock).mockResolvedValue(mockAlteration);
    const { queryClient, wrapper } = createTestWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateAlteration(), { wrapper });

    result.current.mutate(mutationInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should also invalidate the profile-wide alteration list
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["alterations", "by-profile", "user-456"],
      }),
    );
  });

  it("exposes error state when mutation fails", async () => {
    const error = new Error("insert failed");
    (createAlteration as jest.Mock).mockRejectedValue(error);
    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useCreateAlteration(), { wrapper });

    result.current.mutate(mutationInput);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
