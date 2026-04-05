import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import CartHeaderIcon from "../CartHeaderIcon";

/**
 * Mock expo-router — provides router.navigate() and usePathname().
 * We control usePathname's return value per test to simulate
 * being on different screens (edge re-entry guard testing).
 */
const mockNavigate = jest.fn();
let mockPathname = "/";

jest.mock("expo-router", () => ({
  useRouter: () => ({ navigate: mockNavigate }),
  usePathname: () => mockPathname,
}));

/**
 * Mock the cart store — we only need items.length for the selector.
 * CartHeaderIcon should subscribe via (s) => s.items.length for performance.
 */
let mockItems: unknown[] = [];

jest.mock("../../stores/cartStore", () => ({
  useCartStore: (selector: (state: { items: unknown[] }) => unknown) =>
    selector({ items: mockItems }),
}));

describe("CartHeaderIcon", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/";
    mockItems = [];
  });

  // ========================================================================
  // RENDERING
  // ========================================================================

  it("renders the cart icon", () => {
    const { getByLabelText } = render(<CartHeaderIcon />);
    expect(getByLabelText(/cart/i)).toBeTruthy();
  });

  // ========================================================================
  // BADGE BEHAVIOR
  // ========================================================================

  it("hides the badge when cart is empty", () => {
    mockItems = [];
    const { queryByTestId } = render(<CartHeaderIcon />);
    expect(queryByTestId("cart-badge")).toBeNull();
  });

  it("shows the badge with exact count for 1 item", () => {
    mockItems = [{}];
    const { getByTestId } = render(<CartHeaderIcon />);
    expect(getByTestId("cart-badge")).toBeTruthy();
    expect(getByTestId("cart-badge-text").props.children).toBe("1");
  });

  it("shows the badge with exact count for values up to 99", () => {
    mockItems = Array(99).fill({});
    const { getByTestId } = render(<CartHeaderIcon />);
    expect(getByTestId("cart-badge-text").props.children).toBe("99");
  });

  it('shows "99+" when item count exceeds 99', () => {
    mockItems = Array(100).fill({});
    const { getByTestId } = render(<CartHeaderIcon />);
    expect(getByTestId("cart-badge-text").props.children).toBe("99+");
  });

  it('shows "99+" for very large counts', () => {
    mockItems = Array(500).fill({});
    const { getByTestId } = render(<CartHeaderIcon />);
    expect(getByTestId("cart-badge-text").props.children).toBe("99+");
  });

  // ========================================================================
  // NAVIGATION
  // ========================================================================

  it("navigates to /cart on press", () => {
    const { getByLabelText } = render(<CartHeaderIcon />);
    fireEvent.press(getByLabelText(/cart/i));
    expect(mockNavigate).toHaveBeenCalledWith("/cart");
  });

  it("uses navigate (not push) to prevent duplicate screens", () => {
    const { getByLabelText } = render(<CartHeaderIcon />);
    fireEvent.press(getByLabelText(/cart/i));
    // navigate is called, not push — verified by the mock shape
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("navigates even when cart is empty", () => {
    mockItems = [];
    const { getByLabelText } = render(<CartHeaderIcon />);
    fireEvent.press(getByLabelText(/cart/i));
    expect(mockNavigate).toHaveBeenCalledWith("/cart");
  });

  // ========================================================================
  // EDGE RE-ENTRY GUARD
  // ========================================================================

  it("does NOT navigate when already on /cart", () => {
    mockPathname = "/cart";
    const { getByLabelText } = render(<CartHeaderIcon />);
    fireEvent.press(getByLabelText(/cart/i));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ========================================================================
  // ACCESSIBILITY
  // ========================================================================

  it("has accessible label with count when cart has items", () => {
    mockItems = [{}, {}, {}];
    const { getByLabelText } = render(<CartHeaderIcon />);
    expect(getByLabelText("Cart, 3 items")).toBeTruthy();
  });

  it("has accessible label for empty cart", () => {
    mockItems = [];
    const { getByLabelText } = render(<CartHeaderIcon />);
    expect(getByLabelText("Cart, empty")).toBeTruthy();
  });
});
