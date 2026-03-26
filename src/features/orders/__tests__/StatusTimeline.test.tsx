/**
 * Component tests for StatusTimeline.
 *
 * Uses @testing-library/react-native to render the component and assert on
 * what appears on screen. This is Level 2 (component testing) in our testing
 * pyramid — verifies UI contracts that unit tests can't catch, like "does the
 * note text actually render?" or "is the display order reversed?"
 */

import React from "react";
import { render } from "@testing-library/react-native";
import StatusTimeline from "../components/StatusTimeline";
import { OrderStatus, StatusHistoryEntry } from "../../../types";

// ============================================================================
// FIXTURES
// ============================================================================

const singleEntry: StatusHistoryEntry[] = [
  {
    status: OrderStatus.PLACED,
    timestamp: "2026-03-15T10:00:00.000Z",
    note: null,
  },
];

const threeEntries: StatusHistoryEntry[] = [
  {
    status: OrderStatus.PLACED,
    timestamp: "2026-03-15T10:00:00.000Z",
    note: null,
  },
  {
    status: OrderStatus.IN_PRODUCTION,
    timestamp: "2026-03-16T14:30:00.000Z",
    note: "Customer requested rush delivery",
  },
  {
    status: OrderStatus.READY_FOR_TRIAL,
    timestamp: "2026-03-20T09:00:00.000Z",
    note: null,
  },
];

const fullHistory: StatusHistoryEntry[] = [
  {
    status: OrderStatus.PLACED,
    timestamp: "2026-03-01T10:00:00.000Z",
    note: null,
  },
  {
    status: OrderStatus.IN_PRODUCTION,
    timestamp: "2026-03-03T12:00:00.000Z",
    note: null,
  },
  {
    status: OrderStatus.READY_FOR_TRIAL,
    timestamp: "2026-03-10T09:00:00.000Z",
    note: null,
  },
  {
    status: OrderStatus.TRIAL_COMPLETE,
    timestamp: "2026-03-12T16:00:00.000Z",
    note: null,
  },
  {
    status: OrderStatus.ALTERATIONS,
    timestamp: "2026-03-14T11:00:00.000Z",
    note: "Sleeve length adjustment",
  },
  {
    status: OrderStatus.READY_FOR_DELIVERY,
    timestamp: "2026-03-18T10:00:00.000Z",
    note: null,
  },
  {
    status: OrderStatus.DELIVERED,
    timestamp: "2026-03-20T15:00:00.000Z",
    note: null,
  },
];

// ============================================================================
// TESTS
// ============================================================================

describe("StatusTimeline", () => {
  it("renders all entries from statusHistory", () => {
    const { getByText } = render(
      <StatusTimeline statusHistory={threeEntries} />,
    );

    expect(getByText("Placed")).toBeTruthy();
    expect(getByText("In Production")).toBeTruthy();
    expect(getByText("Ready for Trial")).toBeTruthy();
  });

  it("renders a single-entry history without crashing", () => {
    const { getByText } = render(
      <StatusTimeline statusHistory={singleEntry} />,
    );

    expect(getByText("Placed")).toBeTruthy();
  });

  it("renders all 7 statuses in a full lifecycle", () => {
    const { getByText } = render(
      <StatusTimeline statusHistory={fullHistory} />,
    );

    expect(getByText("Placed")).toBeTruthy();
    expect(getByText("In Production")).toBeTruthy();
    expect(getByText("Ready for Trial")).toBeTruthy();
    expect(getByText("Trial Complete")).toBeTruthy();
    expect(getByText("Alterations")).toBeTruthy();
    expect(getByText("Ready for Delivery")).toBeTruthy();
    expect(getByText("Delivered")).toBeTruthy();
  });

  it("displays notes when present", () => {
    const { getByText } = render(
      <StatusTimeline statusHistory={threeEntries} />,
    );

    expect(getByText("Customer requested rush delivery")).toBeTruthy();
  });

  it("does not render 'null' text for entries without notes", () => {
    const { queryByText } = render(
      <StatusTimeline statusHistory={singleEntry} />,
    );

    expect(queryByText("null")).toBeNull();
  });

  it("renders entries in reverse chronological order (newest first)", () => {
    const { getAllByTestId } = render(
      <StatusTimeline statusHistory={threeEntries} />,
    );

    const labels = getAllByTestId("timeline-label");

    // Newest first: Ready for Trial, then In Production, then Placed
    expect(labels[0].children[0]).toBe("Ready for Trial");
    expect(labels[1].children[0]).toBe("In Production");
    expect(labels[2].children[0]).toBe("Placed");
  });

  it("highlights the latest entry with bold styling", () => {
    const { getAllByTestId } = render(
      <StatusTimeline statusHistory={threeEntries} />,
    );

    const labels = getAllByTestId("timeline-label");

    // First label (newest) should have bold fontWeight via inline style
    const firstStyle = labels[0].props.style;
    const flat = Array.isArray(firstStyle)
      ? Object.assign({}, ...firstStyle)
      : firstStyle;
    expect(flat.fontWeight).toBe("700");

    // Second label (past) should not be bold
    const secondStyle = labels[1].props.style;
    const flatSecond = Array.isArray(secondStyle)
      ? Object.assign({}, ...secondStyle)
      : secondStyle;
    expect(flatSecond.fontWeight).toBe("400");
  });
});
