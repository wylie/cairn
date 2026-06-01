import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CustomerPortalPurchasesPage from "@/app/p/[orgSlug]/purchases/page";
import CustomerPortalReceiptDetailPage from "@/app/p/[orgSlug]/purchases/[receiptId]/page";
import { buildScopedMockKey } from "@/lib/mock-storage";
import { TestProviders } from "@/tests/test-providers";

let params = { orgSlug: "summit", receiptId: "txn_hh_1" };

vi.mock("next/navigation", () => ({
  useParams: () => params,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/p/summit/purchases"
}));

function setCustomerSession(customerId: string) {
  const payload = {
    kind: "customer",
    userId: `cust_auth_${customerId}`,
    email: "portal@example.com",
    organizationSlugs: ["summit"],
    customerId
  };
  const encoded = btoa(JSON.stringify(payload)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  document.cookie = `cairn_mock_auth=${encoded}; path=/`;
}

describe("customer portal receipts", () => {
  beforeEach(() => {
    window.print = vi.fn();
    params = { orgSlug: "summit", receiptId: "txn_hh_1" };
    const txKey = buildScopedMockKey("org_summit", "loc_001", "transactions");
    window.localStorage.setItem(
      txKey,
      JSON.stringify([
        {
          id: "txn_hh_1",
          organizationId: "org_summit",
          locationId: "loc_001",
          customerId: "cust_003",
          customerName: "Alex Rivera",
          purchaserCustomerId: "cust_003",
          purchaserCustomerName: "Alex Rivera",
          purchasedForCustomerIds: ["cust_004"],
          householdId: "hh_001",
          transactionType: "sale",
          returnStatus: "none",
          receiptStatus: "paid",
          items: [
            {
              productId: "prd_004",
              productName: "Class Drop-In",
              category: "classes",
              type: "class",
              quantity: 1,
              unitPrice: 26,
              lineTotal: 26
            }
          ],
          subtotal: 26,
          total: 26,
          paymentType: "card",
          completedAt: "2026-05-19T14:10:00Z",
          checkInTriggered: false,
          receiptNumber: "R-HH1"
        },
        {
          id: "txn_private_1",
          organizationId: "org_summit",
          locationId: "loc_001",
          customerId: "cust_006",
          customerName: "Jimbo James",
          purchaserCustomerId: "cust_006",
          purchaserCustomerName: "Jimbo James",
          purchasedForCustomerIds: ["cust_006"],
          transactionType: "sale",
          returnStatus: "none",
          receiptStatus: "pending",
          items: [
            {
              productId: "prd_006",
              productName: "Sauna Day Pass",
              category: "day_passes",
              type: "access",
              quantity: 1,
              unitPrice: 18,
              lineTotal: 18
            }
          ],
          subtotal: 18,
          total: 18,
          paymentType: "cash",
          completedAt: "2026-05-20T14:10:00Z",
          checkInTriggered: false,
          receiptNumber: "R-PRIVATE"
        }
      ])
    );
  });

  it("guardian can view household receipts", () => {
    setCustomerSession("cust_003");
    render(
      <TestProviders>
        <CustomerPortalPurchasesPage />
      </TestProviders>
    );
    expect(screen.getByText("R-HH1")).toBeInTheDocument();
    expect(screen.getByText(/Purchased for:/i)).toBeInTheDocument();
    expect(screen.queryByText("R-PRIVATE")).not.toBeInTheDocument();
  });

  it("unrelated customer cannot view household receipt detail", () => {
    setCustomerSession("cust_005");
    render(
      <TestProviders>
        <CustomerPortalReceiptDetailPage />
      </TestProviders>
    );
    expect(screen.getByText(/Receipt not available/i)).toBeInTheDocument();
  });

  it("receipt detail renders line items and totals", async () => {
    setCustomerSession("cust_003");
    const user = userEvent.setup();
    render(
      <TestProviders>
        <CustomerPortalReceiptDetailPage />
      </TestProviders>
    );
    expect(screen.getByText("Receipt R-HH1")).toBeInTheDocument();
    expect(screen.getByText("Line Items")).toBeInTheDocument();
    expect(screen.getByText("Class Drop-In")).toBeInTheDocument();
    expect(screen.getByText("Totals")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Print Receipt" }));
  });
});
