import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Pure utilities for push notifications.
 *
 * WHY THIS IS A "lib" MODULE (not under src/features/notifications):
 * These helpers are *pure* — they wrap Expo SDK primitives and contain no
 * business rules or Supabase access. Keeping them in `src/lib` mirrors the
 * split used elsewhere (e.g., lib/supabase.ts): low-level infrastructure
 * below, feature-level data/hooks above.
 *
 * FOREGROUND BEHAVIOUR (declared once at app boot):
 * When a push arrives with the app open, Expo's default is to *suppress*
 * the banner — users would silently miss status updates. We opt into
 * showing the banner + list + sound so the UX matches push behaviour
 * while the app is backgrounded. This aligns with the verification flow
 * in PUSH_NOTIFICATIONS_PLAN.md.
 */

// Allow-list of pathnames the push handler is permitted to route to. Any
// other pathname (intentional or injected) is ignored to prevent the router
// from being driven into arbitrary deep links by a crafted push payload.
const ALLOWED_PATHNAMES = ["/order-detail"] as const;
type AllowedPathname = (typeof ALLOWED_PATHNAMES)[number];

export interface ParsedDeepLink {
  pathname: AllowedPathname;
  params: Record<string, string>;
}

export interface PushRegistration {
  token: string;
  platform: "ios" | "android";
}

// ----------------------------------------------------------------------------
// setNotificationHandler
// ----------------------------------------------------------------------------

/**
 * Configure how the OS displays a push that arrives while the app is in the
 * foreground. Called once from `app/_layout.tsx` at module scope (before the
 * component renders) so the handler is in place before the first push can
 * arrive on cold start.
 *
 * shouldShowBanner/List/Sound are the SDK 54 flags. shouldShowAlert
 * is legacy and omitted intentionally.
 */
export function setNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ----------------------------------------------------------------------------
// ensureAndroidChannel
// ----------------------------------------------------------------------------

/**
 * Create / update the default Android notification channel. Required on
 * Android 8+ — notifications without a channel silently fail to display.
 * The config plugin sets the icon/color but does NOT create a channel by
 * itself in SDK 54, so we do it at runtime.
 */
export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "Order updates",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#4f46e5",
  });
}

// ----------------------------------------------------------------------------
// requestPermissionAndGetToken
// ----------------------------------------------------------------------------

/**
 * Single entrypoint to obtain a push token. Returns null on every "not now,
 * not later" branch (simulator, denial, iOS without APNs). Callers must
 * treat null as a silent, non-blocking outcome — the app MUST remain usable
 * when push is unavailable.
 */
export async function requestPermissionAndGetToken(): Promise<PushRegistration | null> {
  // Push tokens cannot be obtained on simulators / emulators for iOS; Android
  // emulators without Play Services also fail. Device.isDevice covers both.
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();

  let status = existing;
  if (existing !== "granted") {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    status = requested;
  }

  if (status !== "granted") return null;

  // projectId is required in SDK 49+. Read from the EAS config injected via
  // app.config.ts. Missing projectId → skip registration (would throw).
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as
    | string
    | undefined;
  if (!projectId) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const platform: "ios" | "android" =
      Platform.OS === "ios" ? "ios" : "android";
    return { token, platform };
  } catch {
    // iOS without APNs creds (dev certs not yet set up) throws here. The
    // rest of the app must not crash — tap handling via xcrun simctl push
    // still works even though registration silently no-ops.
    return null;
  }
}

// ----------------------------------------------------------------------------
// parseDeepLinkFromNotification
// ----------------------------------------------------------------------------

/**
 * Extract a typed { pathname, params } target from a notification response.
 *
 * WHY RETURN STRUCTURED DATA (not a raw string):
 * Callers shouldn't be passing untrusted strings to `router.push`. By
 * validating the pathname against an allow-list and shaping params into a
 * typed object, a malformed/unknown/adversarial payload becomes `null` and
 * the caller simply skips routing — no accidental navigation, no stringly
 * typed path construction.
 */
export function parseDeepLinkFromNotification(
  response: Notifications.NotificationResponse,
): ParsedDeepLink | null {
  const raw = response?.notification?.request?.content?.data?.url;
  if (typeof raw !== "string" || raw.length === 0) return null;

  // Must start with "/" to be a valid in-app pathname. Rejects schemes like
  // "javascript:", "http://…", etc.
  if (!raw.startsWith("/")) return null;

  // Use URL parsing with a dummy base so the query string is handled safely.
  let url: URL;
  try {
    url = new URL(raw, "http://app.local");
  } catch {
    return null;
  }

  const pathname = url.pathname;
  if (!ALLOWED_PATHNAMES.includes(pathname as AllowedPathname)) return null;

  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    params[k] = v;
  });

  // /order-detail is meaningless without an orderId — the route would crash.
  if (pathname === "/order-detail" && !params.orderId) return null;

  return { pathname: pathname as AllowedPathname, params };
}
