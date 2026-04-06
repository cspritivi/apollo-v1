/**
 * Unit tests for HeroBanner — the full-width promotional banner at the
 * top of the Home storefront. Displays headline, subtext, and navigates
 * to a target screen on press.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import HeroBanner from "../HeroBanner";

describe("HeroBanner", () => {
  const defaultProps = {
    headline: "Crafted for You",
    subtext: "Bespoke suits tailored to perfection",
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the headline text", () => {
    const { getByText } = render(<HeroBanner {...defaultProps} />);
    expect(getByText("Crafted for You")).toBeTruthy();
  });

  it("renders the subtext", () => {
    const { getByText } = render(<HeroBanner {...defaultProps} />);
    expect(getByText("Bespoke suits tailored to perfection")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HeroBanner {...defaultProps} onPress={onPress} />,
    );
    fireEvent.press(getByTestId("hero-banner"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("has accessible role and label", () => {
    const { getByLabelText } = render(<HeroBanner {...defaultProps} />);
    expect(getByLabelText("Crafted for You")).toBeTruthy();
  });
});
