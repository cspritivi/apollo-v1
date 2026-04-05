import { Stack } from "expo-router";
import CartHeaderIcon from "../../../../src/components/CartHeaderIcon";
import { stackHeaderOptions } from "../../../../src/lib/headerConfig";

/**
 * Fabrics Stack Layout — nested Stack navigator inside the Fabrics tab.
 *
 * WHY A STACK FOR A SINGLE SCREEN:
 * Fabrics currently has no sub-navigation, but it still needs a Stack so its
 * header is rendered by the same native-stack component as Home and Products.
 * The Tabs navigator renders a visually different header (taller, larger font,
 * different padding). Using a Stack for every tab guarantees pixel-perfect
 * header consistency across all tabs.
 *
 * CART ICON:
 * This Stack sets headerShown: false at the tab level, so it must explicitly
 * include headerRight to carry the cart icon forward. The Tabs layout is the
 * canonical source of truth — this inclusion is required only because we
 * override the header configuration.
 *
 * HEADER STYLING:
 * All visual options come from src/lib/headerConfig.ts (shared config).
 */

// Stable reference — avoids re-creating headerRight on every render
const CartHeaderRight = () => <CartHeaderIcon />;

export default function FabricsLayout() {
  return (
    <Stack
      screenOptions={{
        ...stackHeaderOptions,
        headerRight: CartHeaderRight,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Fabrics" }} />
    </Stack>
  );
}
