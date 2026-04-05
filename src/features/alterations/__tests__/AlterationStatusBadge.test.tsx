/**
 * Component tests for AlterationStatusBadge.
 *
 * Verifies that each AlterationStatus renders the correct human-readable
 * label. Follows the same pattern as the order StatusBadge but with
 * alteration-specific statuses and colors.
 */

import React from "react";
import { render } from "@testing-library/react-native";
import AlterationStatusBadge from "../components/AlterationStatusBadge";
import { AlterationStatus } from "@/types";

describe("AlterationStatusBadge", () => {
  it("renders 'Requested' for REQUESTED status", () => {
    const { getByText } = render(
      <AlterationStatusBadge status={AlterationStatus.REQUESTED} />,
    );
    expect(getByText("Requested")).toBeTruthy();
  });

  it("renders 'In Progress' for IN_PROGRESS status", () => {
    const { getByText } = render(
      <AlterationStatusBadge status={AlterationStatus.IN_PROGRESS} />,
    );
    expect(getByText("In Progress")).toBeTruthy();
  });

  it("renders 'Ready for Pickup' for READY_FOR_PICKUP status", () => {
    const { getByText } = render(
      <AlterationStatusBadge status={AlterationStatus.READY_FOR_PICKUP} />,
    );
    expect(getByText("Ready for Pickup")).toBeTruthy();
  });

  it("renders 'Completed' for COMPLETED status", () => {
    const { getByText } = render(
      <AlterationStatusBadge status={AlterationStatus.COMPLETED} />,
    );
    expect(getByText("Completed")).toBeTruthy();
  });

  it("renders 'Cancelled' for CANCELLED status", () => {
    const { getByText } = render(
      <AlterationStatusBadge status={AlterationStatus.CANCELLED} />,
    );
    expect(getByText("Cancelled")).toBeTruthy();
  });
});
