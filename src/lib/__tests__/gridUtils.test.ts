import { padGridData } from "../gridUtils";

/**
 * Tests for padGridData utility.
 *
 * Verifies null-padding behavior for grid layouts that need items
 * to be a multiple of the column count.
 */

describe("padGridData", () => {
  it("returns the same array when item count is already a multiple of columns", () => {
    const items = ["a", "b", "c", "d"];
    const result = padGridData(items, 2);
    expect(result).toEqual(["a", "b", "c", "d"]);
  });

  it("pads with one null for odd count in 2-column grid", () => {
    const items = ["a", "b", "c"];
    const result = padGridData(items, 2);
    expect(result).toEqual(["a", "b", "c", null]);
  });

  it("pads with two nulls for 1 item in 3-column grid", () => {
    const items = ["a"];
    const result = padGridData(items, 3);
    expect(result).toEqual(["a", null, null]);
  });

  it("returns empty array for empty input", () => {
    const result = padGridData([], 2);
    expect(result).toEqual([]);
  });

  it("pads single item in 2-column grid", () => {
    const items = [{ id: "1" }];
    const result = padGridData(items, 2);
    expect(result).toEqual([{ id: "1" }, null]);
  });

  it("defaults to 2 columns when not specified", () => {
    const items = ["a", "b", "c"];
    const result = padGridData(items);
    expect(result).toEqual(["a", "b", "c", null]);
  });
});
