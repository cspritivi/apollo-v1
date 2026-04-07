import { View, Text, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { ProductOption } from "@/types";
import OptionCard from "@/features/configurator/components/OptionCard";
import { padGridData } from "@/lib/gridUtils";

/**
 * OptionStep — renders one configurator step for a given option group.
 *
 * This is a generic component that works for ANY option group (collar_style,
 * lapel_style, hem_style, etc.). It receives the group's options and renders
 * them in a 2-column grid of OptionCards. The parent (configurator screen)
 * is responsible for determining which option_group maps to the current step.
 *
 * WHY A GENERIC COMPONENT (NOT ONE PER OPTION GROUP):
 * All option groups have the same UI pattern: show images, pick one. There's
 * no reason to have CollarStep, LapelStep, CuffStep — that would be 15+
 * nearly identical components. The generic approach means adding a new
 * option group to a product requires zero UI code changes — just add the
 * group name to the product's option_groups array and seed the options.
 *
 * INTERVIEW TALKING POINT:
 * "The configurator is data-driven. The product's option_groups array
 * defines how many steps there are. The OptionStep component renders any
 * group generically. Adding a new customization option to a product is a
 * database change, not a code change. This is the Open-Closed Principle
 * in practice — the system is open for extension (new options) but closed
 * for modification (no UI code changes needed)."
 */

interface OptionStepProps {
  /** Human-readable title for this step (e.g., "Lapel Style") */
  title: string;
  /** The available options for this group */
  options: ProductOption[];
  /** The currently selected option (if any) */
  selectedOption: ProductOption | undefined;
  /** Called when the user taps an option */
  onSelectOption: (option: ProductOption) => void;
}

/**
 * Converts an option_group database key into a human-readable title.
 * E.g., "collar_style" → "Collar Style", "back_pleat" → "Back Pleat"
 *
 * WHY A UTILITY FUNCTION (NOT STORED IN DB):
 * The display label is a UI concern, not a data concern. Storing it in the
 * database would add a column that only the frontend uses. Deriving it from
 * the key keeps the data layer clean and the transformation is trivial.
 */
export function formatOptionGroupTitle(optionGroup: string): string {
  return optionGroup
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function OptionStep({
  title,
  options,
  selectedOption,
  onSelectOption,
}: OptionStepProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose {title}</Text>
      <Text style={styles.subtitle}>
        {selectedOption
          ? `Selected: ${selectedOption.name}`
          : "Tap an option to select it"}
      </Text>

      {/* FlashList with cell recycling for smooth scrolling.
          extraData ensures cells re-render when the selected option changes —
          without it, recycled cells could show stale selection borders. */}
      <FlashList<ProductOption | null>
        data={padGridData(options)}
        keyExtractor={(item, index) => item?.id ?? `spacer-${index}`}
        numColumns={2}
        extraData={selectedOption?.id}
        renderItem={({ item, index }) =>
          item ? (
            <OptionCard
              option={item}
              isSelected={selectedOption?.id === item.id}
              onSelect={onSelectOption}
              testID={`option-card-${index}`}
            />
          ) : (
            <View style={{ flex: 1, margin: 6 }} />
          )
        }
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  grid: {
    paddingHorizontal: 6,
    paddingBottom: 100, // Extra padding so last row isn't hidden behind nav buttons
  },
});
