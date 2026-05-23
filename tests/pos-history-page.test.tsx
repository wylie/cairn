import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import PosPage from "@/app/(app)/pos/page";
import PosHistoryPage from "@/app/(app)/pos/history/page";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import { TopBar } from "@/components/layout/top-bar";
import { buildScopedMockKey } from "@/lib/mock-storage";
import { TestProviders } from "@/tests/test-providers";

function installStorageMock() {
  const store = new Map<string, string>();
  const original = window.localStorage;

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      })
    }
  });

  return {
    restore() {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: original
      });
    }
  };
}

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "2222") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("POS sales history", () => {
  it("uses aligned filter controls layout", () => {
    render(
      <TestProviders>
        <TopBar />
        <PosHistoryPage />
      </TestProviders>
    );

    const filterBar = screen.getByTestId("sales-history-filterbar");
    expect(filterBar.className).toContain("grid");
    expect(filterBar.className).toContain("[grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]");
    expect(screen.getByLabelText("Search sales history").className).toContain("h-11");
    expect(screen.getByLabelText("Date filter").className).toContain("h-11");
  });

  it("completing sale creates transaction with staff/customer/items and receipt summary", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");

    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(screen.getAllByText(/Receipt #/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Customer: Sam Noaccess/i)).toBeInTheDocument();
    expect(screen.getByText(/Sold by: Maya Lopez/i)).toBeInTheDocument();
    expect(screen.getByText(/Day Pass x1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Total: \$28.00/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Customer: Unknown customer/i)).not.toBeInTheDocument();
  });

  it("completed transaction stores customer id and customer name", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));

    const txKey = buildScopedMockKey("org_summit", "loc_001", "transactions");
    const stored = JSON.parse(window.localStorage.getItem(txKey) ?? "[]");
    expect(stored[0].customerId).toBe("cust_004");
    expect(stored[0].customerName).toBe("Sam Noaccess");
    expect(stored[0].customerEmail).toBe("sam.noaccess@example.com");
    expect(stored[0].customerMemberId).toBe("M-1004");
    expect(stored[0].items[0].unitPrice).toBe(28);
    expect(stored[0].items[0].lineTotal).toBe(28);
    expect(stored[0].subtotal).toBe(28);
    expect(stored[0].total).toBe(28);
    storage.restore();
  });

  it("sales history lists completed sales and search works", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
        <PosHistoryPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(screen.getAllByText(/Sam Noaccess/i).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText("Search sales history"), "day pass");
    expect(screen.getAllByText(/Day Pass/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("$28.00").length).toBeGreaterThan(0);
    expect(screen.getByText(/Sold by Maya Lopez/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sam Noaccess/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Day Pass x1 — \$28.00 \(\$28.00\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Total: \$28.00/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Check-in fulfillment/i)).toBeInTheDocument();
  });

  it("staff comp can create a zero-dollar transaction", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
        <PosHistoryPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.type(screen.getByLabelText("Search products"), "staff comp");
    await user.click(screen.getByRole("button", { name: "Add Staff Comp" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(screen.getAllByText(/Staff Comp/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Total: \$0.00/i).length).toBeGreaterThan(0);
  });

  it("transactions persist after refresh", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();
    const first = render(
      <TestProviders>
        <TopBar />
        <PosPage />
        <PosHistoryPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));

    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <PosHistoryPage />
      </TestProviders>
    );

    expect(screen.getAllByText(/Sam Noaccess/i).length).toBeGreaterThan(0);
    storage.restore();
  });

  it("sales history resolves customer name from customerId when name is missing", () => {
    const storage = installStorageMock();
    const txKey = buildScopedMockKey("org_summit", "loc_001", "transactions");
    const seeded = [
      {
        id: "txn_missing_name",
        organizationId: "org_summit",
        locationId: "loc_001",
        customerId: "cust_004",
        customerName: "Unknown customer",
        soldByStaffId: "staff_002",
        items: [{ productId: "prd_001", productName: "Day Pass", category: "day_passes", type: "access", quantity: 1, unitPrice: 28, lineTotal: 28 }],
        subtotal: 28,
        total: 28,
        paymentType: "mock",
        completedAt: "2026-05-21T12:00:00Z",
        checkInTriggered: false,
        receiptNumber: "R-FIX001"
      }
    ];
    window.localStorage.setItem(txKey, JSON.stringify(seeded));

    render(
      <TestProviders>
        <TopBar />
        <PosHistoryPage />
      </TestProviders>
    );

    expect(screen.getByText("Sam Noaccess")).toBeInTheDocument();
    storage.restore();
  });

  it("legacy records without customer id still show Unknown customer safely", () => {
    const storage = installStorageMock();
    const txKey = buildScopedMockKey("org_summit", "loc_001", "transactions");
    const seeded = [
      {
        id: "txn_legacy_missing_customer",
        organizationId: "org_summit",
        locationId: "loc_001",
        customerId: "",
        customerName: "",
        items: [],
        subtotal: 0,
        total: 0,
        paymentType: "mock",
        completedAt: "2026-05-21T12:00:00Z",
        checkInTriggered: false,
        receiptNumber: "R-LEGACY2"
      }
    ];
    window.localStorage.setItem(txKey, JSON.stringify(seeded));

    render(
      <TestProviders>
        <TopBar />
        <PosHistoryPage />
      </TestProviders>
    );

    expect(screen.getByText("Unknown customer")).toBeInTheDocument();
    storage.restore();
  });

  it("paid multi-item sales display itemized prices and correct total", () => {
    const storage = installStorageMock();
    const txKey = buildScopedMockKey("org_summit", "loc_001", "transactions");
    const seeded = [
      {
        id: "txn_multi",
        organizationId: "org_summit",
        locationId: "loc_001",
        customerId: "cust_001",
        customerName: "Maya Patel",
        soldByStaffId: "staff_002",
        soldByStaffName: "Maya Lopez",
        transactionType: "sale",
        returnStatus: "none",
        items: [
          { productId: "prd_001", productName: "Day Pass", category: "day_passes", type: "access", quantity: 1, unitPrice: 28, lineTotal: 28 },
          { productId: "prd_004", productName: "Class Drop-In", category: "classes", type: "class", quantity: 1, unitPrice: 26, lineTotal: 26 },
          { productId: "prd_005", productName: "Camp Registration", category: "camps", type: "camp", quantity: 1, unitPrice: 45, lineTotal: 45 }
        ],
        subtotal: 99,
        total: 99,
        paymentType: "mock",
        completedAt: "2026-05-21T12:00:00Z",
        checkInTriggered: false,
        receiptNumber: "R-MULTI1"
      }
    ];
    window.localStorage.setItem(txKey, JSON.stringify(seeded));

    render(
      <TestProviders>
        <TopBar />
        <PosHistoryPage />
      </TestProviders>
    );

    expect(screen.getByText(/Day Pass x1 — \$28.00 \(\$28.00\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Class Drop-In x1 — \$26.00 \(\$26.00\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Camp Registration x1 — \$45.00 \(\$45.00\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Total: \$99.00/i)).toBeInTheDocument();
    storage.restore();
  });

  it("customer detail shows purchase history and missing legacy staff is handled", () => {
    render(
      <TestProviders>
        <CustomerDetailView customerId="cust_003" />
      </TestProviders>
    );

    expect(screen.getByLabelText("detail-purchases")).toBeInTheDocument();
    expect(screen.getByText(/Receipt #R-LEGACY/i)).toBeInTheDocument();
    expect(screen.getByText(/Sold by Staff not recorded/i)).toBeInTheDocument();
  });

  it("legacy product price fields normalize so paid sale does not save zero totals", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();
    const productsKey = buildScopedMockKey("org_summit", "loc_001", "products");
    const transactionsKey = buildScopedMockKey("org_summit", "loc_001", "transactions");
    window.localStorage.setItem(
      productsKey,
      JSON.stringify([
        {
          id: "prd_001",
          organizationId: "org_summit",
          name: "Day Pass",
          category: "day_passes",
          type: "access",
          price: 28,
          showAsQuickButton: true,
          accessBehavior: "single_entry",
          active: true
        }
      ])
    );
    window.localStorage.setItem(transactionsKey, JSON.stringify([]));

    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));

    const stored = JSON.parse(window.localStorage.getItem(transactionsKey) ?? "[]");
    expect(stored[0].items[0].unitPrice).toBe(28);
    expect(stored[0].items[0].lineTotal).toBe(28);
    expect(stored[0].total).toBe(28);
    storage.restore();
  });

  it("refresh/load cycle keeps recovered price totals instead of flipping to zero", () => {
    const storage = installStorageMock();
    const productsKey = buildScopedMockKey("org_summit", "loc_001", "products");
    const transactionsKey = buildScopedMockKey("org_summit", "loc_001", "transactions");

    window.localStorage.setItem(
      productsKey,
      JSON.stringify([
        {
          id: "prd_004",
          organizationId: "org_summit",
          name: "Class Drop-In",
          category: "classes",
          type: "class",
          priceCents: 2600,
          accessBehavior: "registration_access",
          active: true
        }
      ])
    );
    window.localStorage.setItem(
      transactionsKey,
      JSON.stringify([
        {
          id: "txn_legacy_recover",
          organizationId: "org_summit",
          locationId: "loc_001",
          customerId: "cust_005",
          customerName: "Dana Daypass",
          soldByStaffId: "staff_003",
          soldByStaffName: "Sam Rivera",
          items: [{ productId: "prd_004", productName: "Class Drop-In", quantity: 1, unitPrice: 0, lineTotal: 0 }],
          subtotal: 0,
          total: 0,
          paymentType: "mock",
          completedAt: "2026-05-20T11:30:00Z",
          checkInTriggered: false,
          receiptNumber: "R-LEGACY"
        }
      ])
    );

    const first = render(
      <TestProviders>
        <TopBar />
        <PosHistoryPage />
      </TestProviders>
    );
    expect(screen.getByText(/Class Drop-In x1 — \$26.00 \(\$26.00\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Total: \$26.00/i)).toBeInTheDocument();
    first.unmount();

    const migratedRaw = JSON.parse(window.localStorage.getItem(transactionsKey) ?? "[]");
    expect(migratedRaw[0].items[0].unitPrice).toBe(26);
    expect(migratedRaw[0].items[0].lineTotal).toBe(26);
    expect(migratedRaw[0].total).toBe(26);

    render(
      <TestProviders>
        <TopBar />
        <PosHistoryPage />
      </TestProviders>
    );
    expect(screen.getByText(/Class Drop-In x1 — \$26.00 \(\$26.00\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Total: \$26.00/i)).toBeInTheDocument();
    storage.restore();
  });
});
