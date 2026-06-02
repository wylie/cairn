import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatDateWithAge,
  formatLongDate,
  formatShortDate,
  formatTime,
  resetGlobalDateTimeFormatting,
  setGlobalDateTimeFormatting
} from "@/lib/format/date";

describe("date formatting utility", () => {
  beforeEach(() => {
    resetGlobalDateTimeFormatting();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats dates as MM/DD/YYYY by default", () => {
    expect(formatDate("2026-06-12")).toBe("06/12/2026");
  });

  it("formats dates as DD/MM/YYYY", () => {
    setGlobalDateTimeFormatting({ dateFormat: "DD/MM/YYYY" });
    expect(formatShortDate("2026-06-12")).toBe("12/06/2026");
  });

  it("formats dates as YYYY-MM-DD", () => {
    setGlobalDateTimeFormatting({ dateFormat: "YYYY-MM-DD" });
    expect(formatDate("2026-06-12")).toBe("2026-06-12");
  });

  it("formats dates as Month D, YYYY", () => {
    setGlobalDateTimeFormatting({ dateFormat: "Month D, YYYY" });
    expect(formatDate("1998-05-12")).toBe("May 12, 1998");
  });

  it("formats long dates for detail views", () => {
    expect(formatLongDate("1998-05-12")).toBe("May 12, 1998");
  });

  it("formats time in 12-hour format by default", () => {
    expect(formatTime("2026-06-12T20:45:00Z")).toMatch(/^4:45 PM$/);
  });

  it("formats time in 24-hour format", () => {
    setGlobalDateTimeFormatting({ timeFormat: "24-hour" });
    expect(formatTime("2026-06-12T20:45:00Z")).toBe("16:45");
  });

  it("formats date times consistently", () => {
    expect(formatDateTime("2026-06-12T14:30:00Z")).toBe("06/12/2026, 10:30 AM");
  });

  it("formats DOB with age", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    expect(formatDateWithAge("1995-08-19")).toBe("08/19/1995 (30)");
  });
});
