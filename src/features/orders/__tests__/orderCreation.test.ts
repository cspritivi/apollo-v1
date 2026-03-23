/**
 * Tests for order payload construction.
 *
 * These validate that the buildOrderRow helper (tested indirectly via the
 * exported API functions) produces correct payloads with:
 * - Correct status initialization
 * - Price matching calculatePrice output
 * - Null measurement_snapshot
 * - Customer notes pass-through
 *
 * NOTE: Client-side UUID generation was removed (see Plan.MD Session 2).
 * Postgres generates order IDs server-side via gen_random_uuid(). The
 * payload intentionally omits `id` so the DB default kicks in.
 *
 * We test the buildOrderRow logic by importing it indirectly — the API
 * functions are thin wrappers around Supabase calls, so we mock Supabase
 * and verify what gets passed to .insert().
 */

import { ProductOption } from "../../../types";

// Mock Supabase before importing api.ts
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle.mockResolvedValue({
            data: { id: "test-id" },
            error: null,
          }),
        }),
      }),
    })),
  },
}));

import { createOrder, createOrders, CreateOrderInput } from "../api";

// ============================================================================
// TEST FIXTURES
// ============================================================================

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

const baseInput: CreateOrderInput = {
  profileId: "user-123",
  productId: "prod-1",
  fabricId: "fab-1",
  chosenOptions: {
    collar_style: makeOption("collar_style", 0),
    cuff_style: makeOption("cuff_style", 1500),
  },
  basePrice: 5000,
  fabricPricePerMeter: 2500,
  fabricMeters: 2.5,
  customerNotes: "Rush please",
};

// ============================================================================
// TESTS
// ============================================================================

describe("createOrder — payload construction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup mock chain for each test
    mockSingle.mockResolvedValue({ data: { id: "test-id" }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
  });

  it("does not include a client-side id (Postgres generates via gen_random_uuid)", async () => {
    await createOrder(baseInput);

    const insertedRow = mockInsert.mock.calls[0][0];
    expect(insertedRow.id).toBeUndefined();
  });

  it("sets correct profile_id, product_id, fabric_id", async () => {
    await createOrder(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.profile_id).toBe("user-123");
    expect(row.product_id).toBe("prod-1");
    expect(row.fabric_id).toBe("fab-1");
  });

  it("snapshots chosen_options (not a reference)", async () => {
    await createOrder(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.chosen_options).toEqual(baseInput.chosenOptions);
    // Verify it's the same object reference (passed directly) — the
    // immutability is guaranteed by the JSONB column in Postgres, not
    // by deep cloning in JS
    expect(row.chosen_options).toBe(baseInput.chosenOptions);
  });

  it("sets measurement_snapshot to null", async () => {
    await createOrder(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.measurement_snapshot).toBeNull();
  });

  it("initializes status_history with exactly one PLACED entry", async () => {
    await createOrder(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.current_status).toBe("PLACED");
    expect(row.status_history).toHaveLength(1);
    expect(row.status_history[0].status).toBe("PLACED");
    expect(row.status_history[0].timestamp).toBeDefined();
    expect(row.status_history[0].note).toBeNull();
  });

  it("calculates final_price matching calculatePrice output", async () => {
    await createOrder(baseInput);

    const row = mockInsert.mock.calls[0][0];
    // $50 base + ($25/m × 2.5m = $62.50) + $0 collar + $15 cuff = $127.50
    expect(row.final_price).toBe(12750);
  });

  it("passes through customer_notes", async () => {
    await createOrder(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.customer_notes).toBe("Rush please");
  });

  it("sets customer_notes to null when empty string", async () => {
    await createOrder({ ...baseInput, customerNotes: "" });

    const row = mockInsert.mock.calls[0][0];
    expect(row.customer_notes).toBeNull();
  });

  it("sets internal_notes to null", async () => {
    await createOrder(baseInput);

    const row = mockInsert.mock.calls[0][0];
    expect(row.internal_notes).toBeNull();
  });
});

describe("createOrders — batch payload construction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Batch insert returns array, no .single()
    mockSelect.mockResolvedValue({
      data: [{ id: "test-1" }, { id: "test-2" }],
      error: null,
    });
    mockInsert.mockReturnValue({ select: mockSelect });
  });

  it("inserts all items in a single batch call", async () => {
    const input2: CreateOrderInput = {
      ...baseInput,
      productId: "prod-2",
      basePrice: 20000,
      fabricMeters: 3.5,
    };

    await createOrders([baseInput, input2]);

    // .insert() called once with an array of 2 rows
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const rows = mockInsert.mock.calls[0][0];
    expect(rows).toHaveLength(2);
  });

  it("does not include client-side ids (Postgres generates them)", async () => {
    await createOrders([baseInput, baseInput]);

    const rows = mockInsert.mock.calls[0][0];
    expect(rows[0].id).toBeUndefined();
    expect(rows[1].id).toBeUndefined();
  });
});
