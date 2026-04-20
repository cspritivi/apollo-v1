import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useSession } from "@/hooks/useSession";
import {
  ensureAndroidChannel,
  requestPermissionAndGetToken,
  parseDeepLinkFromNotification,
} from "@/lib/notifications";
import { upsertPushToken } from "@/features/notifications/api";

/**
 * Orchestrator hook that owns the push lifecycle for an authenticated user.
 *
 * RESPONSIBILITIES:
 *   1. On session-arrived, ensure the Android channel, request permission,
 *      get a token, upsert it to `push_tokens`.
 *   2. Route on warm-start notification taps (app running in background).
 *   3. Route *once* on cold-start (app was terminated and launched by a tap)
 *      — via Notifications.getLastNotificationResponseAsync.
 *   4. Re-upsert on token roll (Expo re-issues occasionally) via
 *      addPushTokenListener. A session-change-only trigger would miss
 *      rolls that happen mid-session.
 *   5. Clean up both listeners on unmount.
 *
 * RETURNS nothing — this is a pure side-effect hook called once from the
 * root layout after useSession resolves.
 *
 * ERROR POLICY:
 * Every branch is non-throwing. A denied permission, a network blip on the
 * upsert, a malformed payload — none of these should surface as a render-tree
 * error or block the UI. Failure is silent.
 */
export function usePushNotifications() {
  const { session } = useSession();
  const router = useRouter();

  // Tracks whether we've already routed the cold-start response. Refs (not
  // state) so writing doesn't trigger re-renders — this is a strict latch.
  const coldStartHandledRef = useRef(false);
  const profileIdRef = useRef<string | null>(null);

  // Keep the latest profileId available for the addPushTokenListener closure,
  // which is installed once. Without this, a token roll late in a session
  // would upsert against a stale profileId from the initial render.
  profileIdRef.current = session?.user?.id ?? null;

  // ------------------------------------------------------------------
  // Registration (runs whenever session.user.id changes)
  // ------------------------------------------------------------------
  const profileId = session?.user?.id ?? null;
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;

    (async () => {
      try {
        await ensureAndroidChannel();
        const reg = await requestPermissionAndGetToken();
        if (!reg || cancelled) return;
        await upsertPushToken({
          profileId,
          token: reg.token,
          platform: reg.platform,
        });
      } catch {
        // Silent — see ERROR POLICY above. Not having a push token must
        // never prevent the user from using the app.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  // ------------------------------------------------------------------
  // Tap routing (warm + cold start)
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const parsed = parseDeepLinkFromNotification(response);
      if (!parsed) return;
      const query = new URLSearchParams(parsed.params).toString();
      const target = query ? `${parsed.pathname}?${query}` : parsed.pathname;
      router.push(target as never);
    };

    const sub =
      Notifications.addNotificationResponseReceivedListener(handleResponse);

    // Cold start: the app was terminated and the user launched it by tapping
    // a notification. We route exactly once — coldStartHandledRef is the
    // latch so StrictMode / re-renders don't re-route the same response.
    (async () => {
      if (coldStartHandledRef.current) return;
      const last = await Notifications.getLastNotificationResponseAsync();
      if (!last || coldStartHandledRef.current) return;
      coldStartHandledRef.current = true;
      handleResponse(last);
    })();

    return () => {
      sub.remove();
    };
  }, [router]);

  // ------------------------------------------------------------------
  // Token roll — re-upsert if Expo rotates the token mid-session
  // ------------------------------------------------------------------
  useEffect(() => {
    const sub = Notifications.addPushTokenListener((tokenEvent) => {
      const pid = profileIdRef.current;
      if (!pid) return;
      const token = (tokenEvent as { data?: string }).data;
      // addPushTokenListener fires with the raw platform token (FCM/APNs),
      // not the Expo-wrapped token. The Expo Push API only accepts
      // ExponentPushToken[...] format, so skip raw platform tokens —
      // they'd be unusable and create orphaned rows.
      if (!token || !token.startsWith("ExponentPushToken[")) return;
      upsertPushToken({
        profileId: pid,
        token,
        platform:
          (tokenEvent as { type?: string }).type === "apns" ? "ios" : "android",
      }).catch(() => {
        // swallow — the next login cycle will reconcile.
      });
    });
    return () => {
      sub.remove();
    };
  }, []);
}
