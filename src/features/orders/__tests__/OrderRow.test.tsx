/**
 * Component tests for OrderRow.
 *
 * Tests both the display contract (price, date, status badge) and the
 * tappable behavior (optional onPress prop). OrderRow is backward-compatible:
 * when no onPress is provided, it renders as a plain View (not tappable).
 * When onPress is provided, it wraps in a Pressable and shows a chevron.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OrderRow from "../components/OrderRow";
import { Order, OrderStatus } from "@/types";

// ============================================================================
// FIXTURES
// ============================================================================

/**
 * Minimal Order fixture with only the fields OrderRow uses.
 * Other fields are set to valid defaults to satisfy the Order type.
 */
const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: "order-abc-123",
  profile_id: "profile-1",
  product_id: "product-1",
  fabric_id: "fabric-1",
  chosen_options: {},
  measurement_snapshot: null,
  current_status: OrderStatus.PLACED,
  status_history: [
    {
      status: OrderStatus.PLACED,
      timestamp: "2026-03-15T10:00:00.000Z",
      note: null,
    },
  ],
  final_price: 25000, // $250.00
  customer_notes: null,
  internal_notes: null,
  created_at: "2026-03-15T10:00:00.000Z",
  updated_at: "2026-03-15T10:00:00.000Z",
  ...overrides,
});

// ============================================================================
// DISPLAY TESTS
// ============================================================================

describe("OrderRow — display", () => {
  it("renders the formatted price", () => {
    const { getByText } = render(<OrderRow order={makeOrder()} />);
    // 25000 cents → $250.00
    expect(getByText("$250.00")).toBeTruthy();
  });

  it("renders the formatted date", () => {
    const { getByText } = render(<OrderRow order={makeOrder()} />);
    // Mar 15, 2026 — toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    expect(getByText("Mar 15, 2026")).toBeTruthy();
  });

  it("renders the status badge", () => {
    const { getByText } = render(
      <OrderRow
        order={makeOrder({ current_status: OrderStatus.IN_PRODUCTION })}
      />,
    );
    expect(getByText("In Production")).toBeTruthy();
  });
});

// ============================================================================
// TAPPABLE BEHAVIOR TESTS
// ============================================================================

describe("OrderRow — tappable", () => {
  it("calls onPress with the order when tapped", () => {
    const onPress = jest.fn();
    const order = makeOrder();
    const { getByTestId } = render(
      <OrderRow order={order} onPress={onPress} />,
    );

    fireEvent.press(getByTestId("order-row"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(order);
  });

  it("shows a chevron indicator when onPress is provided", () => {
    const { getByText } = render(
      <OrderRow order={makeOrder()} onPress={jest.fn()} />,
    );
    // Chevron is rendered as a "›" text character
    expect(getByText("›")).toBeTruthy();
  });

  it("does not show a chevron when onPress is not provided", () => {
    const { queryByText } = render(<OrderRow order={makeOrder()} />);
    expect(queryByText("›")).toBeNull();
  });

  it("does not have a testID when not tappable", () => {
    const { queryByTestId } = render(<OrderRow order={makeOrder()} />);
    // Without onPress, the row is a plain View — no testID for press targeting
    expect(queryByTestId("order-row")).toBeNull();
  });
});
