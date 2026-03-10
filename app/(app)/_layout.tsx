import { Stack } from "expo-router";

/**
 * App Group Layout — navigation structure for authenticated screens.
 *
 * WHY STACK FOR NOW (NOT TABS):
 * We'll eventually switch this to a Tab navigator when we have multiple
 * top-level sections (Catalog, Orders, Profile). For now, a Stack is
 * simpler and avoids premature abstraction. Switching to Tabs later is
 * a one-file change in this layout — the screen files don't need to change
 * at all. That's the power of file-based routing: navigation structure
 * is defined in layouts, not in screens.
 */
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
