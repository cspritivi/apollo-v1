/**
 * Date formatting utilities for order display.
 *
 * Extracted from the inline formatting in OrderRow.tsx so that the order
 * detail screen, status timeline, and order list can all share consistent
 * date presentation. Uses en-US locale to match the rest of the app.
 */

/**
 * Format an ISO timestamp as a short date: "Mar 15, 2026".
 * Used in order lists and detail headers.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format an ISO timestamp as date + time: "Mar 15, 2026 at 2:30 PM".
 * Used in the status timeline where knowing the exact time of each
 * transition matters for customer transparency.
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);

  const datePart = formatDate(iso);

  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${datePart} at ${timePart}`;
}
