import { Stack } from "expo-router";

/**
 * Products Stack Layout — nested Stack navigator inside the Products tab.
 *
 * SCREENS IN THIS STACK:
 * - index: Products catalog grid (initial screen)
 * - configurator: Multi-step product configuration wizard (pushed from catalog)
 *
 * WHY CONFIGURATOR IS IN THIS STACK:
 * The configurator is always entered from the products catalog (tap a product
 * card → push configurator). Placing it in the same Stack means the back button
 * automatically returns to the catalog. Previously it was a hidden tab screen
 * (href: null) which didn't have proper back navigation.
 */
export default function ProductsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: "700" },
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Products" }} />
      <Stack.Screen name="configurator" options={{ title: "Configure" }} />
    </Stack>
  );
}
