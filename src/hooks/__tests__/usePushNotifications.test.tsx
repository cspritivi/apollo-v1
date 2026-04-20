/**
 * Tests for the usePushNotifications orchestrator hook.
 *
 * The hook is side-effect-only. It:
 * 1. When a Supabase session arrives, ensures the Android channel, requests
 *    permission + gets a token, upserts it to Supabase.
 * 2. Subscribes to warm-start notification taps and routes via expo-router.
 * 3. Handles cold-start taps via getLastNotificationResponseAsync once.
 * 4. Re-upserts on token roll via addPushTokenListener.
 * 5. Cleans up all listeners on unmount.
 *
 * We mock at the lib/api boundary so the hook logic is isolated. jest.useFakeTimers
 * is NOT needed — everything is await-resolvable.
 */

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ============================================================================
// MOCKS
// ============================================================================

const mockRouterPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const mockEnsureAndroidChannel = jest.fn().mockResolvedValue(undefined);
const mockRequestPermissionAndGetToken = jest.fn();
const mockParseDeepLinkFromNotification = jest.fn();
jest.mock("@/lib/notifications", () => ({
  ensureAndroidChannel: (...args: unknown[]) =>
    mockEnsureAndroidChannel(...args),
  requestPermissionAndGetToken: (...args: unknown[]) =>
    mockRequestPermissionAndGetToken(...args),
  parseDeepLinkFromNotification: (...args: unknown[]) =>
    mockParseDeepLinkFromNotification(...args),
}));

const mockUpsertPushToken = jest.fn().mockResolvedValue(undefined);
jest.mock("@/features/notifications/api", () => ({
  upsertPushToken: (...args: unknown[]) => mockUpsertPushToken(...args),
  deletePushToken: jest.fn(),
}));

// useSession — we'll flip the return value per test.
let mockSessionValue: { session: null | { user: { id: string } } } = {
  session: null,
};
jest.mock("@/hooks/useSession", () => ({
  useSession: () => mockSessionValue,
}));

// expo-notifications — we capture the listener callbacks so tests can fire them.
const mockAddNotificationResponseReceivedListener = jest.fn();
const mockAddPushTokenListener = jest.fn();
const mockGetLastNotificationResponseAsync = jest.fn();
const mockResponseRemove = jest.fn();
const mockTokenRemove = jest.fn();
jest.mock("expo-notifications", () => ({
  addNotificationResponseReceivedListener: (cb: unknown) => {
    mockAddNotificationResponseReceivedListener(cb);
    return { remove: mockResponseRemove };
  },
  addPushTokenListener: (cb: unknown) => {
    mockAddPushTokenListener(cb);
    return { remove: mockTokenRemove };
  },
  getLastNotificationResponseAsync: () =>
    mockGetLastNotificationResponseAsync(),
}));

// ============================================================================
// HELPERS
// ============================================================================

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

import { usePushNotifications } from "../usePushNotifications";

beforeEach(() => {
  jest.clearAllMocks();
  mockSessionValue = { session: null };
  mockGetLastNotificationResponseAsync.mockResolvedValue(null);
  mockRequestPermissionAndGetToken.mockResolvedValue({
    token: "ExponentPushToken[xyz]",
    platform: "android",
  });
  mockParseDeepLinkFromNotification.mockReturnValue(null);
});

// ============================================================================
// TESTS
// ============================================================================

describe("usePushNotifications — registration", () => {
  it("does not register while session is null", async () => {
    renderHook(() => usePushNotifications(), { wrapper });
    // Let any pending microtasks drain.
    await act(async () => {});
    expect(mockRequestPermissionAndGetToken).not.toHaveBeenCalled();
    expect(mockUpsertPushToken).not.toHaveBeenCalled();
  });

  it("registers when session becomes truthy", async () => {
    mockSessionValue = { session: { user: { id: "user-1" } } };
    renderHook(() => usePushNotifications(), { wrapper });

    await waitFor(() =>
      expect(mockUpsertPushToken).toHaveBeenCalledWith({
        profileId: "user-1",
        token: "ExponentPushToken[xyz]",
        platform: "android",
      }),
    );
    expect(mockEnsureAndroidChannel).toHaveBeenCalled();
  });

  it("is silent when permission is denied (null token) — no throw, no upsert", async () => {
    mockSessionValue = { session: { user: { id: "user-1" } } };
    mockRequestPermissionAndGetToken.mockResolvedValue(null);

    renderHook(() => usePushNotifications(), { wrapper });
    await act(async () => {});
    await act(async () => {});

    expect(mockUpsertPushToken).not.toHaveBeenCalled();
  });
});

describe("usePushNotifications — tap routing", () => {
  it("routes on warm-start notification tap", async () => {
    mockSessionValue = { session: { user: { id: "user-1" } } };
    mockParseDeepLinkFromNotification.mockReturnValue({
      pathname: "/order-detail",
      params: { orderId: "order-1" },
    });

    renderHook(() => usePushNotifications(), { wrapper });

    await waitFor(() =>
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled(),
    );

    const cb = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    act(() => {
      cb({ notification: { request: { content: { data: {} } } } });
    });

    expect(mockRouterPush).toHaveBeenCalledWith(
      "/order-detail?orderId=order-1",
    );
  });

  it("routes once on cold start when getLastNotificationResponseAsync resolves", async () => {
    mockSessionValue = { session: { user: { id: "user-1" } } };
    mockGetLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: {} } } },
    });
    mockParseDeepLinkFromNotification.mockReturnValue({
      pathname: "/order-detail",
      params: { orderId: "order-cold" },
    });

    const { rerender } = renderHook(() => usePushNotifications(), { wrapper });

    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith(
        "/order-detail?orderId=order-cold",
      ),
    );

    // Re-render should NOT re-route the same cold-start response.
    rerender({});
    rerender({});
    expect(mockRouterPush).toHaveBeenCalledTimes(1);
  });

  it("ignores malformed payloads (parseDeepLink returns null)", async () => {
    mockSessionValue = { session: { user: { id: "user-1" } } };
    mockParseDeepLinkFromNotification.mockReturnValue(null);

    renderHook(() => usePushNotifications(), { wrapper });

    await waitFor(() =>
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled(),
    );
    const cb = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    act(() => {
      cb({ notification: { request: { content: { data: { url: "/bad" } } } } });
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

describe("usePushNotifications — token roll + cleanup", () => {
  it("re-upserts on in-session token roll", async () => {
    mockSessionValue = { session: { user: { id: "user-1" } } };
    renderHook(() => usePushNotifications(), { wrapper });

    await waitFor(() => expect(mockAddPushTokenListener).toHaveBeenCalled());
    await waitFor(() => expect(mockUpsertPushToken).toHaveBeenCalledTimes(1));

    const cb = mockAddPushTokenListener.mock.calls[0][0];
    await act(async () => {
      cb({ data: "ExponentPushToken[rolled]", type: "expo" });
    });

    await waitFor(() =>
      expect(mockUpsertPushToken).toHaveBeenCalledWith({
        profileId: "user-1",
        token: "ExponentPushToken[rolled]",
        platform: "android",
      }),
    );
  });

  it("ignores raw FCM/APNs tokens (only upserts ExponentPushToken format)", async () => {
    mockSessionValue = { session: { user: { id: "user-1" } } };
    renderHook(() => usePushNotifications(), { wrapper });

    await waitFor(() => expect(mockAddPushTokenListener).toHaveBeenCalled());
    await waitFor(() => expect(mockUpsertPushToken).toHaveBeenCalledTimes(1));

    const cb = mockAddPushTokenListener.mock.calls[0][0];
    await act(async () => {
      cb({ data: "cZRoJQotSRuHEYiYwF45_4:APA91bE9DpXg...", type: "expo" });
    });

    // Should still be 1 — the raw token was skipped.
    expect(mockUpsertPushToken).toHaveBeenCalledTimes(1);
  });

  it("cleans up both listeners on unmount", async () => {
    mockSessionValue = { session: { user: { id: "user-1" } } };
    const { unmount } = renderHook(() => usePushNotifications(), { wrapper });

    await waitFor(() =>
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled(),
    );
    await waitFor(() => expect(mockAddPushTokenListener).toHaveBeenCalled());

    unmount();

    expect(mockResponseRemove).toHaveBeenCalled();
    expect(mockTokenRemove).toHaveBeenCalled();
  });
});
