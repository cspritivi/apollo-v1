import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import FitGuaranteeBadge from "../FitGuaranteeBadge";

describe("FitGuaranteeBadge", () => {
  describe("compact variant", () => {
    it("renders shield icon and short text", () => {
      const { getByText } = render(<FitGuaranteeBadge variant="compact" />);
      expect(getByText("Perfect Fit Guaranteed")).toBeTruthy();
    });

    it("is the default variant", () => {
      const { getByText } = render(<FitGuaranteeBadge />);
      expect(getByText("Perfect Fit Guaranteed")).toBeTruthy();
    });

    it("does not show the description text", () => {
      const { queryByText } = render(<FitGuaranteeBadge variant="compact" />);
      expect(queryByText(/free alterations/i)).toBeNull();
    });
  });

  describe("full variant", () => {
    it("renders the headline and description", () => {
      const { getByText } = render(<FitGuaranteeBadge variant="full" />);
      expect(getByText("Perfect Fit Guaranteed")).toBeTruthy();
      expect(
        getByText(
          "Not sure about fit? We guarantee it. Free alterations if it's not perfect.",
        ),
      ).toBeTruthy();
    });
  });

  describe("tap interaction", () => {
    it("shows the policy modal when tapped", () => {
      const { getByText, queryByText } = render(
        <FitGuaranteeBadge variant="compact" />,
      );

      // Policy detail should not be visible initially
      expect(queryByText(/Our Fit Guarantee/)).toBeNull();

      fireEvent.press(getByText("Perfect Fit Guaranteed"));

      // Policy modal content should appear
      expect(getByText("Our Fit Guarantee")).toBeTruthy();
    });

    it("closes the policy modal when close button is tapped", () => {
      const { getByText, queryByText, getByLabelText } = render(
        <FitGuaranteeBadge variant="full" />,
      );

      // Open modal
      fireEvent.press(getByText("Perfect Fit Guaranteed"));
      expect(getByText("Our Fit Guarantee")).toBeTruthy();

      // Close modal
      fireEvent.press(getByLabelText("Close guarantee details"));
      expect(queryByText("Our Fit Guarantee")).toBeNull();
    });
  });
});
