/**
 * Unit tests for QuickActions — row of prominent CTA buttons on the
 * Home storefront. Drives navigation to key app sections.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import QuickActions from "../QuickActions";

const mockNavigate = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ navigate: mockNavigate }),
}));

describe("QuickActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a "Design Your Suit" action', () => {
    const { getByText } = render(<QuickActions />);
    expect(getByText("Design Your Suit")).toBeTruthy();
  });

  it('renders a "Browse Fabrics" action', () => {
    const { getByText } = render(<QuickActions />);
    expect(getByText("Browse Fabrics")).toBeTruthy();
  });

  it("navigates to Products tab when Design Your Suit is pressed", () => {
    const { getByText } = render(<QuickActions />);
    fireEvent.press(getByText("Design Your Suit"));
    expect(mockNavigate).toHaveBeenCalledWith("/(products)");
  });

  it("navigates to Fabrics tab when Browse Fabrics is pressed", () => {
    const { getByText } = render(<QuickActions />);
    fireEvent.press(getByText("Browse Fabrics"));
    expect(mockNavigate).toHaveBeenCalledWith("/(fabrics)");
  });
});
