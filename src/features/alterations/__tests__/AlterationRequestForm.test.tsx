/**
 * Component tests for the AlterationRequestForm.
 *
 * Tests form validation, submit behavior, and disabled states.
 * The form is a pure presentational component that receives callbacks —
 * the screen handles navigation and session wiring.
 *
 * WHY TEST THE FORM COMPONENT (not the screen):
 * The screen depends on Expo Router (useLocalSearchParams, useRouter) and
 * useSession, which are hard to mock cleanly. Extracting the form as a
 * component lets us test validation and submit logic without mocking
 * navigation infrastructure.
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AlterationRequestForm from "../components/AlterationRequestForm";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const defaultProps = {
  onSubmit: jest.fn(),
  isPending: false,
};

// ============================================================================
// RENDERING TESTS
// ============================================================================

describe("AlterationRequestForm — rendering", () => {
  it("renders description input", () => {
    const { getByPlaceholderText } = render(
      <AlterationRequestForm {...defaultProps} />,
    );
    expect(getByPlaceholderText(/describe the alterations/i)).toBeTruthy();
  });

  it("renders notes input", () => {
    const { getByPlaceholderText } = render(
      <AlterationRequestForm {...defaultProps} />,
    );
    expect(getByPlaceholderText(/additional notes/i)).toBeTruthy();
  });

  it("renders submit button", () => {
    const { getByText } = render(<AlterationRequestForm {...defaultProps} />);
    expect(getByText("Submit Request")).toBeTruthy();
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe("AlterationRequestForm — validation", () => {
  it("does not call onSubmit when description is empty", () => {
    const onSubmit = jest.fn();
    const { getByText } = render(
      <AlterationRequestForm {...defaultProps} onSubmit={onSubmit} />,
    );

    fireEvent.press(getByText("Submit Request"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not call onSubmit when description is too short (< 10 chars)", () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <AlterationRequestForm {...defaultProps} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(
      getByPlaceholderText(/describe the alterations/i),
      "Too short",
    );
    fireEvent.press(getByText("Submit Request"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows validation error when description is too short", () => {
    const { getByPlaceholderText, getByText } = render(
      <AlterationRequestForm {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText(/describe the alterations/i),
      "Short",
    );
    fireEvent.press(getByText("Submit Request"));

    expect(getByText(/at least 10 characters/i)).toBeTruthy();
  });
});

// ============================================================================
// SUBMIT TESTS
// ============================================================================

describe("AlterationRequestForm — submit", () => {
  it("calls onSubmit with description and notes when valid", () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <AlterationRequestForm {...defaultProps} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(
      getByPlaceholderText(/describe the alterations/i),
      "Take in waist by 1 inch on both sides",
    );
    fireEvent.changeText(
      getByPlaceholderText(/additional notes/i),
      "Gained some weight",
    );
    fireEvent.press(getByText("Submit Request"));

    expect(onSubmit).toHaveBeenCalledWith({
      description: "Take in waist by 1 inch on both sides",
      customerNotes: "Gained some weight",
    });
  });

  it("calls onSubmit with empty customerNotes when notes field is blank", () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <AlterationRequestForm {...defaultProps} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(
      getByPlaceholderText(/describe the alterations/i),
      "Take in waist by 1 inch on both sides",
    );
    fireEvent.press(getByText("Submit Request"));

    expect(onSubmit).toHaveBeenCalledWith({
      description: "Take in waist by 1 inch on both sides",
      customerNotes: "",
    });
  });

  it("trims whitespace from description before submit", () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <AlterationRequestForm {...defaultProps} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(
      getByPlaceholderText(/describe the alterations/i),
      "   Take in waist by 1 inch   ",
    );
    fireEvent.press(getByText("Submit Request"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Take in waist by 1 inch",
      }),
    );
  });
});

// ============================================================================
// PENDING STATE TESTS
// ============================================================================

describe("AlterationRequestForm — pending state", () => {
  it("shows loading text when isPending is true", () => {
    const { getByText } = render(
      <AlterationRequestForm {...defaultProps} isPending={true} />,
    );

    expect(getByText("Submitting...")).toBeTruthy();
  });

  it("disables submit button when isPending is true", () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <AlterationRequestForm
        {...defaultProps}
        onSubmit={onSubmit}
        isPending={true}
      />,
    );

    fireEvent.changeText(
      getByPlaceholderText(/describe the alterations/i),
      "Take in waist by 1 inch on both sides",
    );
    fireEvent.press(getByText("Submitting..."));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
