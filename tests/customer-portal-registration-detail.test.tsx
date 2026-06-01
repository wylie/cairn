import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CustomerPortalRegistrationsPage from "@/app/p/[orgSlug]/registrations/page";
import CustomerPortalRegistrationDetailPage from "@/app/p/[orgSlug]/registrations/[registrationId]/page";
import { buildScopedMockKey } from "@/lib/mock-storage";
import { TestProviders } from "@/tests/test-providers";

let params = { orgSlug: "summit", registrationId: "reg_001" };

vi.mock("next/navigation", () => ({
  useParams: () => params,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/p/summit/registrations"
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

describe("customer portal registration detail", () => {
  beforeEach(() => {
    params = { orgSlug: "summit", registrationId: "reg_001" };
    setCustomerSession("cust_003");
    const txKey = buildScopedMockKey("org_summit", "loc_001", "transactions");
    window.localStorage.setItem(
      txKey,
      JSON.stringify([
        {
          id: "txn_reg_001",
          organizationId: "org_summit",
          locationId: "loc_001",
          customerId: "cust_002",
          customerName: "Jordan Kim",
          purchaserCustomerId: "cust_003",
          purchaserCustomerName: "Alex Rivera",
          purchasedForCustomerIds: ["cust_002"],
          householdId: "hh_001",
          transactionType: "sale",
          returnStatus: "none",
          receiptStatus: "paid",
          items: [
            {
              productId: "prd_004",
              productName: "Morning Mobility Flow",
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
          completedAt: "2026-05-21T14:10:00Z",
          checkInTriggered: false,
          receiptNumber: "R-REG001"
        }
      ])
    );
  });

  it("renders registration details and attendance history", () => {
    render(
      <TestProviders>
        <CustomerPortalRegistrationDetailPage />
      </TestProviders>
    );
    expect(screen.getByText("Registration Details")).toBeInTheDocument();
    expect(screen.getByText(/Program:/i)).toBeInTheDocument();
    expect(screen.getByText(/Instructor:/i)).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText(/Completion status:/i)).toBeInTheDocument();
  });

  it("shows household context for registration", () => {
    render(
      <TestProviders>
        <CustomerPortalRegistrationDetailPage />
      </TestProviders>
    );
    expect(screen.getByText(/Registered member:/i)).toBeInTheDocument();
    expect(screen.getByText(/Household members:/i)).toBeInTheDocument();
    expect(screen.getByText(/Alex Rivera/)).toBeInTheDocument();
    expect(screen.getAllByText(/Jordan Kim/).length).toBeGreaterThan(0);
  });

  it("shows related receipt link for registration purchases", () => {
    render(
      <TestProviders>
        <CustomerPortalRegistrationDetailPage />
      </TestProviders>
    );
    expect(screen.getByText("R-REG001")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View receipt" })).toHaveAttribute("href", "/p/summit/purchases/txn_reg_001");
  });

  it("registrations list links to registration detail", () => {
    render(
      <TestProviders>
        <CustomerPortalRegistrationsPage />
      </TestProviders>
    );
    expect(screen.getAllByRole("link", { name: "View registration" })[0]).toHaveAttribute("href", "/p/summit/registrations/reg_001");
  });
});
