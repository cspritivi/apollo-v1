import { Stack } from "expo-router";

/**
 * Auth Group Layout — navigation structure for unauthenticated screens.
 *
 * WHY STACK NAVIGATOR HERE:
 * Login and Sign-Up are a natural stack: the user starts at Login, can
 * push to Sign-Up, and press back to return. Stack navigation provides
 * the familiar push/pop animation and back button behavior.
 *
 * WHY headerShown: false:
 * We'll build custom headers in the auth screens for full design control.
 * The default Stack header is functional but doesn't match a branded
 * login experience. Hiding it here gives us a clean canvas.
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
