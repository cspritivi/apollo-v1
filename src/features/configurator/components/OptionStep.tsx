import { View, Text, FlatList, StyleSheet } from "react-native";
import { ProductOption } from "../../../types";
import OptionCard from "./OptionCard";

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

      {/* WHY PAD WITH NULL:
          FlatList with numColumns={2} and flex:1 cards causes the last item
          to stretch full-width when the count is odd. Appending a null entry
          lets us render an invisible spacer that occupies the empty cell,
          keeping all real cards the same size. Same fix as the main catalog. */}
      <FlatList
        data={options.length % 2 !== 0 ? [...options, null] : options}
        keyExtractor={(item, index) => item?.id ?? `spacer-${index}`}
        numColumns={2}
        renderItem={({ item }) =>
          item ? (
            <OptionCard
              option={item}
              isSelected={selectedOption?.id === item.id}
              onSelect={onSelectOption}
            />
          ) : (
            <View style={{ flex: 1, margin: 6 }} />
          )
        }
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.columnWrapper}
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
  columnWrapper: {
    justifyContent: "space-between" as const,
  },
});
