/**
 * Unit tests for the Profile screen.
 *
 * The Profile screen is the account dashboard: user info, recent orders,
 * quick links (saved fabrics, measurements), and sign out. It replaced the
 * old Home screen's account functionality as part of #20.
 *
 * Tests are written before the component (TDD). Each test documents a
 * specific contract the Profile screen must satisfy.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
// eslint-disable-next-line no-restricted-imports -- screen lives in app/, no @/ alias available
import ProfileScreen from "../../../../app/(app)/(tabs)/(profile)/index";
import { Order, OrderStatus } from "@/types";

// ============================================================================
// MOCKS — use module-level variables that jest.mock factories can't reference.
// Instead, we control behavior per test by mutating module-scope variables
// that the mock implementations close over via require-time binding.
// ============================================================================

const mockPush = jest.fn();
const mockNavigate = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, navigate: mockNavigate }),
}));

/**
 * Mock session — the mock returns a getter function so we can swap values
 * per test. jest.mock hoisting prevents referencing outer variables directly.
 */
let mockSession = {
  user: {
    id: "user-123",
    email: "test@example.com",
    user_metadata: { full_name: "John Doe" },
  },
};
let mockSessionLoading = false;

jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({
    session: mockSession,
    isLoading: mockSessionLoading,
  }),
}));

/** Mock orders — controlled per test */
let mockOrders: Order[] = [];
let mockOrdersLoading = false;

jest.mock("@/features/orders/hooks", () => ({
  useOrders: () => ({
    data: mockOrders,
    isLoading: mockOrdersLoading,
  }),
}));

/** Mock sign out mutation */
const mockLogout = jest.fn();
let mockSignOutPending = false;

jest.mock("@/features/auth/hooks", () => ({
  useSignOut: () => ({
    mutate: mockLogout,
    isPending: mockSignOutPending,
  }),
}));

// ============================================================================
// FIXTURES
// ============================================================================

const makeOrder = (overrides = {}) => ({
  id: "order-abc-123",
  profile_id: "user-123",
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
  final_price: 25000,
  customer_notes: null,
  internal_notes: null,
  created_at: "2026-03-15T10:00:00.000Z",
  updated_at: "2026-03-15T10:00:00.000Z",
  ...overrides,
});

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockOrders = [];
  mockOrdersLoading = false;
  mockSignOutPending = false;
  mockSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
      user_metadata: { full_name: "John Doe" },
    },
  };
  mockSessionLoading = false;
});

// ============================================================================
// PROFILE HEADER
// ============================================================================

describe("ProfileScreen — header", () => {
  it("renders the user's full name", () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText("John Doe")).toBeTruthy();
  });

  it("renders the user's email", () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText("test@example.com")).toBeTruthy();
  });

  it("renders an initials avatar with the first letter of the name", () => {
    const { getByTestId } = render(<ProfileScreen />);
    const avatar = getByTestId("profile-avatar");
    expect(avatar).toBeTruthy();
    // The avatar should show "J" (first letter of "John Doe")
    expect(getByTestId("profile-avatar-initial").props.children).toBe("J");
  });

  it("falls back to email initial when full_name is missing", () => {
    mockSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        user_metadata: { full_name: "" },
      },
    };
    const { getByTestId } = render(<ProfileScreen />);
    expect(getByTestId("profile-avatar-initial").props.children).toBe("T");
  });
});

// ============================================================================
// MY ORDERS SECTION
// ============================================================================

describe("ProfileScreen — orders", () => {
  it("shows a loading indicator while orders are loading", () => {
    mockOrdersLoading = true;
    const { getByTestId } = render(<ProfileScreen />);
    expect(getByTestId("orders-loading")).toBeTruthy();
  });

  it('shows "No orders yet" empty state when there are no orders', () => {
    mockOrders = [];
    const { getByText } = render(<ProfileScreen />);
    expect(getByText(/no orders yet/i)).toBeTruthy();
  });

  it("renders recent orders with OrderRow components", () => {
    mockOrders = [
      makeOrder({ id: "order-1", final_price: 10000 }),
      makeOrder({ id: "order-2", final_price: 20000 }),
    ];
    const { getByText } = render(<ProfileScreen />);
    expect(getByText("$100.00")).toBeTruthy();
    expect(getByText("$200.00")).toBeTruthy();
  });

  it("limits displayed orders to 5 and shows View All link", () => {
    mockOrders = Array.from({ length: 7 }, (_, i) =>
      makeOrder({ id: `order-${i}`, final_price: (i + 1) * 1000 }),
    );
    const { getByText, queryByText } = render(<ProfileScreen />);
    // First 5 orders shown
    expect(getByText("$10.00")).toBeTruthy();
    expect(getByText("$50.00")).toBeTruthy();
    // 6th and 7th not shown
    expect(queryByText("$60.00")).toBeNull();
    // "View All Orders" link present
    expect(getByText("View All Orders")).toBeTruthy();
  });

  it("navigates to order detail when an order is tapped", () => {
    mockOrders = [makeOrder({ id: "order-nav-test" })];
    const { getByTestId } = render(<ProfileScreen />);
    fireEvent.press(getByTestId("order-row"));
    expect(mockPush).toHaveBeenCalledWith(
      "/order-detail?orderId=order-nav-test",
    );
  });

  it("navigates to full orders list when View All is tapped", () => {
    mockOrders = Array.from({ length: 6 }, (_, i) =>
      makeOrder({ id: `order-${i}` }),
    );
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText("View All Orders"));
    expect(mockPush).toHaveBeenCalledWith("/orders");
  });
});

// ============================================================================
// QUICK LINKS
// ============================================================================

describe("ProfileScreen — quick links", () => {
  it("renders a Saved Fabrics link that navigates to saved-fabrics", () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText("Saved Fabrics"));
    expect(mockPush).toHaveBeenCalledWith("/saved-fabrics");
  });

  it("renders a disabled My Measurements row with Coming Soon label", () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText("My Measurements")).toBeTruthy();
    expect(getByText("Coming Soon")).toBeTruthy();
  });

  it("does not navigate when My Measurements is tapped", () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText("My Measurements"));
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ============================================================================
// SIGN OUT
// ============================================================================

describe("ProfileScreen — sign out", () => {
  it("renders a Sign Out button", () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText("Sign Out")).toBeTruthy();
  });

  it("calls the signOut mutation when Sign Out is pressed", () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText("Sign Out"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("shows loading text while sign out is pending", () => {
    mockSignOutPending = true;
    const { getByText } = render(<ProfileScreen />);
    expect(getByText("Signing out...")).toBeTruthy();
  });

  it("disables the button while sign out is pending", () => {
    mockSignOutPending = true;
    const { getByText } = render(<ProfileScreen />);
    // The Pressable should be disabled — pressing it should not call logout again
    fireEvent.press(getByText("Signing out..."));
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
