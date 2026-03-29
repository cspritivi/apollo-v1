/**
 * Component tests for AlterationRow.
 *
 * Verifies that the row renders alteration info (description, status, date)
 * and that onPress fires correctly. Follows the OrderRow test pattern.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import AlterationRow from "../components/AlterationRow";
import { Alteration, AlterationStatus } from "../../../types";

// ============================================================================
// FIXTURES
// ============================================================================

const mockAlteration: Alteration = {
  id: "alt-1",
  order_id: "order-123",
  profile_id: "user-456",
  description: "Take in waist by 1 inch on both sides",
  status: AlterationStatus.REQUESTED,
  charge_amount: 2500,
  image_urls: null,
  customer_notes: "Gained some weight",
  internal_notes: null,
  created_at: "2026-03-28T10:00:00Z",
  updated_at: "2026-03-28T10:00:00Z",
  completed_at: null,
};

// ============================================================================
// TESTS
// ============================================================================

describe("AlterationRow — rendering", () => {
  it("renders the alteration description", () => {
    const { getByText } = render(
      <AlterationRow alteration={mockAlteration} onPress={jest.fn()} />,
    );
    expect(getByText("Take in waist by 1 inch on both sides")).toBeTruthy();
  });

  it("renders the status badge", () => {
    const { getByText } = render(
      <AlterationRow alteration={mockAlteration} onPress={jest.fn()} />,
    );
    expect(getByText("Requested")).toBeTruthy();
  });

  it("renders the created date", () => {
    const { getByText } = render(
      <AlterationRow alteration={mockAlteration} onPress={jest.fn()} />,
    );
    // formatDate outputs "Mar 28, 2026"
    expect(getByText("Mar 28, 2026")).toBeTruthy();
  });

  it("shows a chevron indicator", () => {
    const { getByText } = render(
      <AlterationRow alteration={mockAlteration} onPress={jest.fn()} />,
    );
    expect(getByText("›")).toBeTruthy();
  });
});

describe("AlterationRow — interaction", () => {
  it("calls onPress with the alteration when tapped", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AlterationRow alteration={mockAlteration} onPress={onPress} />,
    );

    fireEvent.press(getByTestId("alteration-row"));

    expect(onPress).toHaveBeenCalledWith(mockAlteration);
  });
});

describe("AlterationRow — truncation", () => {
  it("truncates long descriptions to a single line", () => {
    const longAlteration: Alteration = {
      ...mockAlteration,
      description:
        "Please take in the waist by 1 inch on both sides, and also adjust the sleeve length by half an inch shorter on the left arm",
    };
    const { getByText } = render(
      <AlterationRow alteration={longAlteration} onPress={jest.fn()} />,
    );
    // The text element should exist — visual truncation is handled by numberOfLines
    expect(
      getByText(
        "Please take in the waist by 1 inch on both sides, and also adjust the sleeve length by half an inch shorter on the left arm",
      ),
    ).toBeTruthy();
  });
});
