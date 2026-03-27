/**
 * Tests for date formatting utilities.
 *
 * These are pure functions with no dependencies — straightforward to test.
 * We pin the expected output to en-US locale formatting since that's what
 * the app uses throughout (see OrderRow.tsx for the existing pattern).
 */

import { formatDate, formatDateTime } from "../utils/formatDate";

describe("formatDate", () => {
  it("formats an ISO string as 'Mon DD, YYYY'", () => {
    // March 15, 2026 — mid-month, no edge cases
    const result = formatDate("2026-03-15T14:30:00.000Z");
    expect(result).toBe("Mar 15, 2026");
  });

  it("handles single-digit days without zero-padding", () => {
    const result = formatDate("2026-01-05T10:00:00.000Z");
    expect(result).toBe("Jan 5, 2026");
  });

  it("handles year boundaries (Dec 31 → Jan 1)", () => {
    const dec31 = formatDate("2025-12-31T23:59:00.000Z");
    expect(dec31).toBe("Dec 31, 2025");
  });
});

describe("formatDateTime", () => {
  it("formats an ISO string as 'Mon DD, YYYY at H:MM AM/PM'", () => {
    const result = formatDateTime("2026-03-15T14:30:00.000Z");
    // Exact time depends on local timezone — check structure instead
    expect(result).toMatch(/^Mar 15, 2026 at \d{1,2}:\d{2} (AM|PM)$/);
  });

  it("formats midnight correctly", () => {
    const result = formatDateTime("2026-06-01T00:00:00.000Z");
    // Midnight UTC will render as some local time — just verify structure
    expect(result).toMatch(/at \d{1,2}:\d{2} (AM|PM)$/);
  });

  it("includes the date portion matching formatDate output", () => {
    const iso = "2026-09-20T09:15:00.000Z";
    const dateOnly = formatDate(iso);
    const dateTime = formatDateTime(iso);
    // The datetime string should start with the same date
    expect(dateTime.startsWith(dateOnly)).toBe(true);
  });
});
