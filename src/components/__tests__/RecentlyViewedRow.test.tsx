import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import RecentlyViewedRow from "../RecentlyViewedRow";
import { RecentlyViewedItem } from "@/stores/recentlyViewedStore";
import { ConfiguratorSnapshot } from "@/stores/configuratorSnapshotStore";

/**
 * Tests for the "In Progress" pill on RecentlyViewedRow (issue #49).
 *
 * The component now subscribes to the configurator snapshot store and
 * decorates product cards that have a saved configuration with a pill.
 * The pill is gated on hasHydrated to prevent a flicker on cold start
 * (AsyncStorage rehydrate is async, and an unhydrated read returns no
 * snapshots even when one exists on disk).
 */

let mockItems: RecentlyViewedItem[] = [];
let mockSnapshots: Record<string, ConfiguratorSnapshot> = {};
let mockHasHydrated = false;

jest.mock("../../stores/recentlyViewedStore", () => ({
  useRecentlyViewedStore: (
    selector: (state: { items: RecentlyViewedItem[] }) => unknown,
  ) => selector({ items: mockItems }),
}));

jest.mock("../../stores/configuratorSnapshotStore", () => ({
  useConfiguratorSnapshotStore: (
    selector: (state: {
      snapshots: Record<string, ConfiguratorSnapshot>;
      hasHydrated: boolean;
    }) => unknown,
  ) => selector({ snapshots: mockSnapshots, hasHydrated: mockHasHydrated }),
}));

const productItem = (id: string, name: string): RecentlyViewedItem => ({
  id,
  type: "product",
  name,
  imageUrl: null,
  price: 49900,
  viewedAt: Date.now(),
});

const fabricItem = (id: string, name: string): RecentlyViewedItem => ({
  id,
  type: "fabric",
  name,
  imageUrl: null,
  price: 4500,
  viewedAt: Date.now(),
});

const sampleSnapshot: ConfiguratorSnapshot = {
  fabricId: "fab-1",
  selectedOptionIds: { collar_style: "opt-1" },
  currentStep: 1,
  customerNotes: "",
  savedAt: Date.now(),
};

beforeEach(() => {
  mockItems = [];
  mockSnapshots = {};
  mockHasHydrated = false;
});

describe("RecentlyViewedRow -- In Progress pill", () => {
  it("does not render the pill when the snapshot store has not hydrated yet", () => {
    // Snapshot exists on disk, but hasHydrated is still false (cold start).
    // We must NOT show the pill in this window or it would flicker on/off.
    mockItems = [productItem("p1", "Suit")];
    mockSnapshots = { p1: sampleSnapshot };
    mockHasHydrated = false;

    const { queryByLabelText } = render(
      <RecentlyViewedRow onItemPress={jest.fn()} />,
    );

    // Card a11y label should be the plain "Suit, recently viewed" -- no
    // ", in progress" suffix until hasHydrated.
    expect(queryByLabelText("Suit, recently viewed")).toBeTruthy();
    expect(queryByLabelText("Suit, recently viewed, in progress")).toBeNull();
  });

  it("renders the pill when a snapshot exists and the store is hydrated", () => {
    mockItems = [productItem("p1", "Suit")];
    mockSnapshots = { p1: sampleSnapshot };
    mockHasHydrated = true;

    const { getByLabelText, getByText } = render(
      <RecentlyViewedRow onItemPress={jest.fn()} />,
    );

    expect(getByText("In Progress")).toBeTruthy();
    expect(getByLabelText("Suit, recently viewed, in progress")).toBeTruthy();
  });

  it("does not render the pill for products without a snapshot", () => {
    mockItems = [productItem("p1", "Suit"), productItem("p2", "Shirt")];
    mockSnapshots = { p1: sampleSnapshot };
    mockHasHydrated = true;

    const { getByLabelText, queryByLabelText, getAllByText } = render(
      <RecentlyViewedRow onItemPress={jest.fn()} />,
    );

    expect(getByLabelText("Suit, recently viewed, in progress")).toBeTruthy();
    expect(queryByLabelText("Shirt, recently viewed, in progress")).toBeNull();
    expect(getByLabelText("Shirt, recently viewed")).toBeTruthy();
    // Only one "In Progress" pill renders (the matching product).
    expect(getAllByText("In Progress")).toHaveLength(1);
  });

  it("fires onItemPress with the tapped item and applies pressed styling", () => {
    // The render-only pill tests never exercise the card's press path. This
    // covers both the onPress callback (the screen wires navigation to it)
    // and the Pressable's `pressed && styles.cardPressed` style branch.
    mockItems = [productItem("p1", "Suit")];
    mockHasHydrated = true;
    const onItemPress = jest.fn();

    const { getByLabelText } = render(
      <RecentlyViewedRow onItemPress={onItemPress} />,
    );

    const card = getByLabelText("Suit, recently viewed");

    // pressIn/pressOut toggle the internal pressed state, re-invoking the
    // style callback with `pressed: true` (the cardPressed branch).
    fireEvent(card, "pressIn");
    fireEvent(card, "pressOut");

    // Tap fires the callback with the exact item that was rendered.
    fireEvent.press(card);

    expect(onItemPress).toHaveBeenCalledTimes(1);
    expect(onItemPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1", type: "product", name: "Suit" }),
    );
  });

  it("renders nothing when there are no items", () => {
    // Empty browsing history -> the row should disappear entirely rather
    // than show an empty "Recently Viewed" header (covers the early return).
    mockItems = [];
    mockHasHydrated = true;

    const { toJSON } = render(<RecentlyViewedRow onItemPress={jest.fn()} />);

    expect(toJSON()).toBeNull();
  });

  it("filters items by type when filterType is provided", () => {
    // The Fabrics screen passes filterType="product"/"fabric" to scope the
    // row. This covers the `filterType ? items.filter(...) : items` branch.
    mockItems = [productItem("p1", "Suit"), fabricItem("f1", "Wool")];
    mockHasHydrated = true;

    const { getByLabelText, queryByLabelText } = render(
      <RecentlyViewedRow onItemPress={jest.fn()} filterType="product" />,
    );

    expect(getByLabelText("Suit, recently viewed")).toBeTruthy();
    expect(queryByLabelText("Wool, recently viewed")).toBeNull();
  });

  it("never renders the pill on fabric items", () => {
    // A snapshot is keyed by productId, so even if a fabric happened to
    // share an id with a snapshot key, the pill should not appear.
    mockItems = [fabricItem("p1", "Wool")];
    mockSnapshots = { p1: sampleSnapshot };
    mockHasHydrated = true;

    const { queryByText, getByLabelText } = render(
      <RecentlyViewedRow onItemPress={jest.fn()} />,
    );

    expect(queryByText("In Progress")).toBeNull();
    expect(getByLabelText("Wool, recently viewed")).toBeTruthy();
  });
});
