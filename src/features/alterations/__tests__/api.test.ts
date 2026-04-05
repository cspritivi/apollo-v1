/**
 * Tests for alterations API layer.
 *
 * Covers:
 * - createAlteration payload construction (correct fields, defaults, nulls)
 * - fetchAlterationsByOrder (query shape, ordering)
 * - fetchAlterationsByProfile (query shape, ordering)
 * - fetchAlterationById (single record retrieval)
 * - Error propagation from Supabase
 *
 * Pattern: Mock Supabase at module level, verify what gets passed to
 * .insert() / .select() / .eq(). Same approach as orderCreation.test.ts.
 */

import { AlterationStatus } from "@/types";

// ============================================================================
// SUPABASE MOCK
// ============================================================================

// Individual mock functions so we can inspect calls and configure returns
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();

/**
 * WHY THIS MOCK STRUCTURE:
 * Supabase's query builder uses method chaining (.from().select().eq().order()).
 * We need each method to return an object with the next method in the chain.
 * The mock resets in beforeEach to configure different chains per test group.
 */
jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      // For insert (createAlteration)
      insert: mockInsert,
      // For select queries (fetch*)
      select: mockSelect,
    })),
  },
}));

import {
  createAlteration,
  fetchAlterationsByOrder,
  fetchAlterationsByProfile,
  fetchAlterationById,
  CreateAlterationInput,
} from "../api";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const baseInput: CreateAlterationInput = {
  orderId: "order-123",
  profileId: "user-456",
  description: "Take in waist by 1 inch",
  chargeAmount: 2500, // $25.00 in cents
  customerNotes: "Gained some weight over winter",
};

const mockAlteration = {
  id: "alt-1",
  order_id: "order-123",
  profile_id: "user-456",
  description: "Take in waist by 1 inch",
  status: AlterationStatus.REQUESTED,
  charge_amount: 2500,
  image_urls: null,
  customer_notes: "Gained some weight over winter",
  internal_notes: null,
  created_at: "2026-03-28T00:00:00Z",
  updated_at: "2026-03-28T00:00:00Z",
  completed_at: null,
};

// ============================================================================
// createAlteration TESTS
// ============================================================================

describe("createAlteration — payload construction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Chain: .insert(row).select().single()
    mockSingle.mockResolvedValue({ data: mockAlteration, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
  });

  it("does not include a client-side id (Postgres generates via gen_random_uuid)", async () => {
    await createAlteration(baseInput);

    const insertedRow = mockInsert.mock.calls[0][0];
    expect(insertedRow.id).toBeUndefined();
  });

  it("sets correct order_id and profile_id", async () => {
    await createAlteration(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.order_id).toBe("order-123");
    expect(row.profile_id).toBe("user-456");
  });

  it("passes through description", async () => {
    await createAlteration(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.description).toBe("Take in waist by 1 inch");
  });

  it("sets status to REQUESTED", async () => {
    await createAlteration(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.status).toBe(AlterationStatus.REQUESTED);
  });

  it("passes through charge_amount", async () => {
    await createAlteration(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.charge_amount).toBe(2500);
  });

  it("sets image_urls to null when not provided", async () => {
    await createAlteration(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.image_urls).toBeNull();
  });

  it("passes through image_urls when provided", async () => {
    const urls = ["https://storage.example.com/img1.jpg"];
    await createAlteration({ ...baseInput, imageUrls: urls });

    const row = mockInsert.mock.calls[0][0];
    expect(row.image_urls).toEqual(urls);
  });

  it("passes through customer_notes", async () => {
    await createAlteration(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.customer_notes).toBe("Gained some weight over winter");
  });

  it("sets customer_notes to null when empty string", async () => {
    await createAlteration({ ...baseInput, customerNotes: "" });

    const row = mockInsert.mock.calls[0][0];
    expect(row.customer_notes).toBeNull();
  });

  it("sets customer_notes to null when not provided", async () => {
    const { customerNotes, ...inputWithoutNotes } = baseInput;
    await createAlteration(inputWithoutNotes as CreateAlterationInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.customer_notes).toBeNull();
  });

  it("sets internal_notes to null (tailor adds these later)", async () => {
    await createAlteration(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.internal_notes).toBeNull();
  });

  it("sets completed_at to null", async () => {
    await createAlteration(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.completed_at).toBeNull();
  });

  it("returns the created alteration", async () => {
    const result = await createAlteration(baseInput);
    expect(result).toEqual(mockAlteration);
  });

  it("throws when Supabase returns an error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    });

    await expect(createAlteration(baseInput)).rejects.toEqual({
      message: "insert failed",
    });
  });
});

// ============================================================================
// fetchAlterationsByOrder TESTS
// ============================================================================

describe("fetchAlterationsByOrder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Chain: .select('*').eq('order_id', id).order(...)
    mockOrder.mockResolvedValue({ data: [mockAlteration], error: null });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
  });

  it("queries the alterations table", async () => {
    const { supabase } = require("../../../lib/supabase");
    await fetchAlterationsByOrder("order-123");

    expect(supabase.from).toHaveBeenCalledWith("alterations");
  });

  it("selects all columns", async () => {
    await fetchAlterationsByOrder("order-123");

    expect(mockSelect).toHaveBeenCalledWith("*");
  });

  it("filters by order_id", async () => {
    await fetchAlterationsByOrder("order-123");

    expect(mockEq).toHaveBeenCalledWith("order_id", "order-123");
  });

  it("orders by created_at descending (newest first)", async () => {
    await fetchAlterationsByOrder("order-123");

    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("returns the alterations array", async () => {
    const result = await fetchAlterationsByOrder("order-123");
    expect(result).toEqual([mockAlteration]);
  });

  it("throws when Supabase returns an error", async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: "fetch failed" },
    });

    await expect(fetchAlterationsByOrder("order-123")).rejects.toEqual({
      message: "fetch failed",
    });
  });
});

// ============================================================================
// fetchAlterationsByProfile TESTS
// ============================================================================

describe("fetchAlterationsByProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Chain: .select('*, orders(products(name))').eq('profile_id', id).order(...)
    mockOrder.mockResolvedValue({ data: [mockAlteration], error: null });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
  });

  it("filters by profile_id", async () => {
    await fetchAlterationsByProfile("user-456");

    expect(mockEq).toHaveBeenCalledWith("profile_id", "user-456");
  });

  it("orders by created_at descending", async () => {
    await fetchAlterationsByProfile("user-456");

    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("returns the alterations array", async () => {
    const result = await fetchAlterationsByProfile("user-456");
    expect(result).toEqual([mockAlteration]);
  });

  it("throws when Supabase returns an error", async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: "fetch failed" },
    });

    await expect(fetchAlterationsByProfile("user-456")).rejects.toEqual({
      message: "fetch failed",
    });
  });
});

// ============================================================================
// fetchAlterationById TESTS
// ============================================================================

describe("fetchAlterationById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Chain: .select('*').eq('id', id).single()
    mockSingle.mockResolvedValue({ data: mockAlteration, error: null });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
  });

  it("queries by alteration id", async () => {
    await fetchAlterationById("alt-1");

    expect(mockEq).toHaveBeenCalledWith("id", "alt-1");
  });

  it("returns a single alteration", async () => {
    const result = await fetchAlterationById("alt-1");
    expect(result).toEqual(mockAlteration);
  });

  it("throws when Supabase returns an error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    await expect(fetchAlterationById("alt-1")).rejects.toEqual({
      message: "not found",
    });
  });
});
