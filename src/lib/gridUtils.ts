/**
 * Utility for grid layouts that use FlashList or FlatList with numColumns.
 *
 * WHY this exists:
 * When a grid has an odd number of items, the last item in a multi-column
 * layout can stretch to fill the full row width. Padding the data array
 * with null values forces the list to render an invisible spacer in the
 * empty column, keeping the last real item at its correct column width.
 * This pattern was duplicated in 4 grid components — centralizing it
 * prevents divergence and makes the intent explicit.
 */

/**
 * Pads an array with null values so its length is a multiple of `columns`.
 * Null items should render as invisible spacer Views in the list's
 * renderItem function.
 */
export function padGridData<T>(items: T[], columns = 2): (T | null)[] {
  const remainder = items.length % columns;
  if (remainder === 0) return items;
  const padding = Array<null>(columns - remainder).fill(null);
  return [...items, ...padding];
}
