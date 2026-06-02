import { describe, expect, it } from "vitest";
import { formatDateTime, formatLongDate, formatShortDate, formatTime } from "@/lib/format/date";

describe("date formatting utility", () => {
  it("formats short dates as dd/mm/yyyy", () => {
    expect(formatShortDate("2026-06-12")).toBe("12/06/2026");
  });

  it("formats long dates for detail views", () => {
    expect(formatLongDate("1998-05-12")).toBe("May 12, 1998");
  });

  it("formats date times consistently", () => {
    expect(formatDateTime("2026-06-12T14:30:00Z")).toContain("12/06/2026");
  });

  it("formats times without returning raw iso strings", () => {
    expect(formatTime("2026-06-12T14:30:00Z")).toMatch(/^\d{1,2}:\d{2}\s?[AP]M$/);
  });
});
