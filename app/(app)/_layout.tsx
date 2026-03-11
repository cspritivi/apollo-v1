import { Tabs } from "expo-router";

/**
 * App Group Layout — tab-based navigation for authenticated screens.
 *
 * WHY TABS NOW (PREVIOUSLY STACK):
 * With two top-level sections (Home and Fabrics), a tab navigator provides
 * the expected mobile UX — users can switch between sections with a single
 * tap and each tab preserves its own navigation state. This is the standard
 * pattern used by every major e-commerce and catalog app (Etsy, ASOS, etc.).
 *
 * WHY expo-router Tabs (NOT @react-navigation/bottom-tabs DIRECTLY):
 * Expo Router's <Tabs> wraps @react-navigation/bottom-tabs but integrates
 * with file-based routing. Each file in app/(app)/ automatically becomes
 * a tab screen. No manual route registration needed — adding a new tab is
 * just creating a new file.
 *
 * INTERVIEW TALKING POINT:
 * Switching from Stack to Tabs was a one-file change (this layout file only).
 * The screen files (index.tsx, fabrics.tsx) didn't change at all. This is the
 * power of separating navigation structure (layouts) from screen content —
 * you can restructure navigation without touching business logic.
 */
export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#4f46e5", // Indigo — matches price accent color
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerTitleStyle: {
          fontWeight: "700",
        },
      }}
    >
      {/**
       * Tab order is defined by the order of <Tabs.Screen> declarations here,
       * NOT by the file names. This gives us explicit control over tab ordering
       * even though the screens are file-based.
       */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="fabrics"
        options={{
          title: "Fabrics",
          tabBarLabel: "Fabrics",
        }}
      />
    </Tabs>
  );
}
