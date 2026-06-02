import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ReportsPage from "@/app/(app)/reports/page";
import { TopBar } from "@/components/layout/top-bar";
import { buildScopedMockKey } from "@/lib/mock-storage";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/reports",
  useSearchParams: () => new URLSearchParams(window.location.search)
}));

function installStorageMock() {
  const store = new Map<string, string>();
  const original = window.localStorage;
  const localStorageMock = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => store.clear())
  } as Storage;
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: localStorageMock
  });
  return {
    restore: () => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        writable: true,
        value: original
      });
    }
  };
}

async function switchStaff(user: ReturnType<typeof userEvent.setup>, pin: string) {
  await user.click(screen.getByRole("button", { name: "Switch" }));
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Reports dashboards", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/reports");
  });

  it("supports report category and range from query params", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/reports?category=attendance&range=today");
    render(
      <TestProviders>
        <TopBar />
        <ReportsPage />
      </TestProviders>
    );
    await switchStaff(user, "2222");

    expect(screen.getByText("Show-up Rate")).toBeInTheDocument();
    expect(screen.getByText("Attendance")).toBeInTheDocument();
  });

  it("shows front desk operational dashboard and hides owner financial cards", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ReportsPage />
      </TestProviders>
    );
    await switchStaff(user, "3333");

    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText("Gross Sales")).toBeInTheDocument();
    expect(screen.queryByText("Restricted")).not.toBeInTheDocument();
  });

  it("owner sees financial cards", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ReportsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");

    await user.click(screen.getByRole("button", { name: "Financial Summary" }));
    expect(screen.getByText("Gross Revenue")).toBeInTheDocument();
    expect(screen.getByText("Comp Transactions")).toBeInTheDocument();
  });

  it("renders household report cards", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ReportsPage />
      </TestProviders>
    );
    await switchStaff(user, "2222");

    await user.click(screen.getByRole("button", { name: "Households" }));
    expect(screen.getByText("Total Households")).toBeInTheDocument();
    expect(screen.getByText("Top Visiting Households")).toBeInTheDocument();
    expect(screen.getByText("Household Revenue")).toBeInTheDocument();
  });

  it("instructor is blocked from Reports", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ReportsPage />
      </TestProviders>
    );
    await switchStaff(user, "4444");

    expect(screen.getByText("You do not have permission to perform this action.")).toBeInTheDocument();
  });

  it("renders filters and chart containers", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ReportsPage />
      </TestProviders>
    );
    await switchStaff(user, "2222");
    expect(screen.getByLabelText("report-filters")).toBeInTheDocument();
    expect(screen.getByLabelText("Search reports")).toBeInTheDocument();
    expect(screen.getByLabelText("report-categories")).toBeInTheDocument();
    expect(screen.getByTestId("trend-line-chart")).toBeInTheDocument();
  });

  it("shows attendance metrics including show-up, fill-rate, and waitlist utilization", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ReportsPage />
      </TestProviders>
    );
    await switchStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Attendance" }));
    expect(screen.getByText("Show-up Rate")).toBeInTheDocument();
    expect(screen.getByText("Fill Rate")).toBeInTheDocument();
    expect(screen.getByText("Waitlist Utilization")).toBeInTheDocument();
    expect(screen.getByText("Instructor Attendance Trend")).toBeInTheDocument();
  });

  it("exports CSV from report data", async () => {
    const storage = installStorageMock();
    window.localStorage.setItem(
      buildScopedMockKey("org_summit", "loc_001", "transactions"),
      JSON.stringify([
        {
          id: "txn_test_1",
          organizationId: "org_summit",
          locationId: "loc_001",
          customerId: "cust_001",
          customerName: "Maya Patel",
          transactionType: "sale",
          returnStatus: "none",
          soldByStaffId: "staff_001",
          soldByStaffName: "Taylor Nguyen",
          items: [
            {
              productId: "prod_daypass",
              productName: "Day Pass",
              category: "day_passes",
              type: "access",
              quantity: 1,
              unitPrice: 2800,
              lineTotal: 2800
            }
          ],
          subtotal: 2800,
          total: 2800,
          completedAt: new Date().toISOString(),
          paymentType: "mock",
          checkInTriggered: false,
          receiptNumber: "R-TEST"
        }
      ])
    );
    const user = userEvent.setup();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob://mock")
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn()
    });
    render(
      <TestProviders>
        <TopBar />
        <ReportsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: originalCreate });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: originalRevoke });
    storage.restore();
  });

  it("shows graceful empty state for product chart when no transactions exist", async () => {
    const storage = installStorageMock();
    window.localStorage.setItem(
      buildScopedMockKey("org_summit", "loc_001", "transactions"),
      JSON.stringify([])
    );
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ReportsPage />
      </TestProviders>
    );
    await switchStaff(user, "2222");
    expect(screen.getByText("No data found for this filter range. Try expanding date range or clearing filters.")).toBeInTheDocument();
    storage.restore();
  });

  it("supports sales category drill-down table", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ReportsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    expect(screen.getByLabelText("sales-drilldown-table")).toBeInTheDocument();
    expect(screen.getByText("Product / Category Drill-Down")).toBeInTheDocument();
  });

  it("expands receipt rows to show receipt details and line items", async () => {
    const storage = installStorageMock();
    window.localStorage.setItem(
      buildScopedMockKey("org_summit", "loc_001", "transactions"),
      JSON.stringify([
        {
          id: "txn_expand_1",
          organizationId: "org_summit",
          locationId: "loc_001",
          customerId: "cust_004",
          customerName: "Sam Noaccess",
          transactionType: "sale",
          returnStatus: "none",
          soldByStaffId: "staff_002",
          soldByStaffName: "Maya Lopez",
          items: [
            {
              productId: "prd_001",
              productName: "Day Pass",
              category: "day_passes",
              type: "access",
              quantity: 2,
              unitPrice: 2800,
              lineTotal: 5600
            }
          ],
          subtotal: 5600,
          total: 5600,
          completedAt: new Date().toISOString(),
          paymentType: "mock",
          checkInTriggered: false,
          receiptNumber: "R-123ABC"
        }
      ])
    );
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ReportsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "R-123ABC" }));
    expect(screen.getByText("Receipt ID:")).toBeInTheDocument();
    expect(screen.getByText("Line Total")).toBeInTheDocument();
    storage.restore();
  });
});
