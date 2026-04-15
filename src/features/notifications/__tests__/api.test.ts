/**
 * Tests for the notifications API layer.
 *
 * Pattern mirrors src/features/alterations/__tests__/api.test.ts — mock
 * Supabase's chained builder and assert on what we pass into insert/upsert/
 * delete, then on the shape of what we return.
 *
 * Idempotency is THE critical guarantee here: `upsertPushToken` MUST be
 * called with onConflict on `token` so logging in twice on the same device
 * doesn't create duplicate rows (acceptance criterion in the plan).
 */

const mockUpsert = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: mockUpsert,
      delete: mockDelete,
    })),
  },
}));

import { upsertPushToken, deletePushToken } from "../api";

// ============================================================================
// upsertPushToken
// ============================================================================

describe("upsertPushToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockResolvedValue({ data: null, error: null });
  });

  it("writes to the push_tokens table", async () => {
    const { supabase } = require("../../../lib/supabase");
    await upsertPushToken({
      profileId: "user-1",
      token: "ExponentPushToken[xyz]",
      platform: "android",
    });
    expect(supabase.from).toHaveBeenCalledWith("push_tokens");
  });

  it("uses onConflict on the token column so duplicate logins do not create duplicate rows", async () => {
    await upsertPushToken({
      profileId: "user-1",
      token: "ExponentPushToken[xyz]",
      platform: "android",
    });
    const [, options] = mockUpsert.mock.calls[0];
    expect(options?.onConflict).toBe("token");
  });

  it("sends profile_id, token, platform, and a fresh last_seen_at", async () => {
    const before = Date.now();
    await upsertPushToken({
      profileId: "user-1",
      token: "ExponentPushToken[xyz]",
      platform: "android",
    });
    const after = Date.now();
    const [row] = mockUpsert.mock.calls[0];
    expect(row.profile_id).toBe("user-1");
    expect(row.token).toBe("ExponentPushToken[xyz]");
    expect(row.platform).toBe("android");
    // last_seen_at must be an ISO string bracketing "now" — confirms we're
    // bumping it on every upsert, not relying on the DB default.
    expect(typeof row.last_seen_at).toBe("string");
    const t = Date.parse(row.last_seen_at);
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });

  it("throws when Supabase returns an error", async () => {
    mockUpsert.mockResolvedValue({
      data: null,
      error: { message: "upsert failed" },
    });
    await expect(
      upsertPushToken({
        profileId: "user-1",
        token: "ExponentPushToken[xyz]",
        platform: "android",
      }),
    ).rejects.toEqual({ message: "upsert failed" });
  });
});

// ============================================================================
// deletePushToken
// ============================================================================

describe("deletePushToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEq.mockResolvedValue({ data: null, error: null });
    mockDelete.mockReturnValue({ eq: mockEq });
  });

  it("deletes by token from push_tokens", async () => {
    const { supabase } = require("../../../lib/supabase");
    await deletePushToken("ExponentPushToken[xyz]");
    expect(supabase.from).toHaveBeenCalledWith("push_tokens");
    expect(mockEq).toHaveBeenCalledWith("token", "ExponentPushToken[xyz]");
  });

  it("throws when Supabase returns an error", async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: "denied" } });
    await expect(deletePushToken("tok")).rejects.toEqual({ message: "denied" });
  });
});
