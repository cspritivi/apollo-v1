/**
 * Tests for src/lib/notifications.ts pure utilities.
 *
 * Covers:
 * - parseDeepLinkFromNotification (valid, unknown pathname, malformed, missing).
 * - requestPermissionAndGetToken guards (non-device / simulator, iOS without
 *   APNs, permission denied — all return null non-throwing).
 *
 * The permission/token fn is tested via mocked expo-notifications + expo-device
 * modules at module boundary — we don't boot native modules under jest-node.
 */

// ============================================================================
// MOCKS
// ============================================================================

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();
const mockSetNotificationHandler = jest.fn();

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  setNotificationHandler: mockSetNotificationHandler,
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
}));

jest.mock("expo-device", () => ({
  // Flipped per-test via the mocked module reference.
  get isDevice() {
    return (jest.requireMock("expo-device") as { __isDevice: boolean })
      .__isDevice;
  },
  __isDevice: true,
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { eas: { projectId: "test-project-id" } } },
  },
}));

// Silence the module-level Platform lookup without booting RN. react-native
// is imported transitively by jest-expo; under jest-node we stub it.
jest.mock("react-native", () => ({ Platform: { OS: "android" } }), {
  virtual: true,
});

import {
  parseDeepLinkFromNotification,
  requestPermissionAndGetToken,
} from "../notifications";

// Helper: build a minimal NotificationResponse shape — we only need data.url.
function buildResponse(url: unknown) {
  return {
    notification: {
      request: { content: { data: url === undefined ? {} : { url } } },
    },
  } as unknown as Parameters<typeof parseDeepLinkFromNotification>[0];
}

// ============================================================================
// parseDeepLinkFromNotification
// ============================================================================

describe("parseDeepLinkFromNotification", () => {
  it("parses a valid /order-detail url with orderId", () => {
    const result = parseDeepLinkFromNotification(
      buildResponse("/order-detail?orderId=abc-123"),
    );
    expect(result).toEqual({
      pathname: "/order-detail",
      params: { orderId: "abc-123" },
    });
  });

  it("returns null when url is missing", () => {
    expect(parseDeepLinkFromNotification(buildResponse(undefined))).toBeNull();
  });

  it("returns null when url is not a string", () => {
    expect(parseDeepLinkFromNotification(buildResponse(42))).toBeNull();
  });

  it("returns null when pathname is not in the allow-list", () => {
    expect(
      parseDeepLinkFromNotification(buildResponse("/unknown?foo=bar")),
    ).toBeNull();
  });

  it("returns null when /order-detail is missing orderId", () => {
    expect(
      parseDeepLinkFromNotification(buildResponse("/order-detail")),
    ).toBeNull();
  });

  it("returns null for malformed urls", () => {
    // No leading slash, nonsense content — never crash, just skip.
    expect(
      parseDeepLinkFromNotification(buildResponse("javascript:alert(1)")),
    ).toBeNull();
  });
});

// ============================================================================
// requestPermissionAndGetToken — guards
// ============================================================================

describe("requestPermissionAndGetToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mocked flag each test.
    (jest.requireMock("expo-device") as { __isDevice: boolean }).__isDevice =
      true;
    mockGetPermissionsAsync.mockResolvedValue({ status: "undetermined" });
    mockRequestPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockGetExpoPushTokenAsync.mockResolvedValue({
      data: "ExponentPushToken[abc]",
    });
  });

  it("returns null on a simulator (Device.isDevice === false)", async () => {
    (jest.requireMock("expo-device") as { __isDevice: boolean }).__isDevice =
      false;
    const result = await requestPermissionAndGetToken();
    expect(result).toBeNull();
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("returns null and does not throw when permission is denied", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: "undetermined" });
    mockRequestPermissionsAsync.mockResolvedValue({ status: "denied" });
    const result = await requestPermissionAndGetToken();
    expect(result).toBeNull();
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("skips prompting when permission already granted, and returns token", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: "granted" });
    const result = await requestPermissionAndGetToken();
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(result).toEqual({
      token: "ExponentPushToken[abc]",
      platform: "android",
    });
  });

  it("prompts when undetermined, granted → returns token", async () => {
    const result = await requestPermissionAndGetToken();
    expect(mockRequestPermissionsAsync).toHaveBeenCalled();
    expect(result).toEqual({
      token: "ExponentPushToken[abc]",
      platform: "android",
    });
  });

  it("returns null if the native getExpoPushTokenAsync throws (iOS w/o APNs)", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockGetExpoPushTokenAsync.mockRejectedValue(
      new Error("No APNs token available"),
    );
    const result = await requestPermissionAndGetToken();
    expect(result).toBeNull();
  });
});
