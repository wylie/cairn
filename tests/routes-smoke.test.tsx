import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TestProviders } from "@/tests/test-providers";
import DashboardPage from "@/app/(app)/dashboard/page";
import CustomersPage from "@/app/(app)/customers/page";
import CheckInPage from "@/app/(app)/check-in/page";
import CalendarPage from "@/app/(app)/calendar/page";
import ProgramsPage from "@/app/(app)/programs/page";
import RegistrationsPage from "@/app/(app)/registrations/page";
import ProductsPage from "@/app/(app)/products/page";
import PosPage from "@/app/(app)/pos/page";
import ReportsPage from "@/app/(app)/reports/page";
import StaffPage from "@/app/(app)/staff/page";
import SettingsPage from "@/app/(app)/settings/page";
import WaiversPage from "@/app/(app)/waivers/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams()
}));

describe("Primary routes smoke", () => {
  const pages = [
    DashboardPage,
    CustomersPage,
    CheckInPage,
    CalendarPage,
    RegistrationsPage,
    ProgramsPage,
    ProductsPage,
    PosPage,
    ReportsPage,
    StaffPage,
    SettingsPage,
    WaiversPage
  ];

  it("renders all primary routes without crashing", () => {
    pages.forEach((Page) => {
      expect(() =>
        render(
          <TestProviders>
            <Page />
          </TestProviders>
        )
      ).not.toThrow();
    });
  });
});
