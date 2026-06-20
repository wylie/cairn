import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MembershipsPage from "@/app/p/[orgSlug]/memberships/page";
import MembershipDetailPage from "@/app/p/[orgSlug]/memberships/[membershipId]/page";
import { buildScopedMockKey } from "@/lib/mock-storage";
import { TestProviders } from "@/tests/test-providers";

let params = { orgSlug: "summit", membershipId: "mem_003" };

vi.mock("next/navigation", () => ({
  useParams: () => params,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => `/p/${params.orgSlug}/memberships/${params.membershipId}`
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

describe("customer portal membership details", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T10:00:00Z"));
    params = { orgSlug: "summit", membershipId: "mem_003" };
    setCustomerSession("cust_003");
    const txKey = buildScopedMockKey("org_summit", "loc_001", "transactions");
    window.localStorage.setItem(
      txKey,
      JSON.stringify([
        {
          id: "txn_mem_renewal",
          organizationId: "org_summit",
          locationId: "loc_001",
          customerId: "cust_003",
          customerName: "Alex Rivera",
          purchaserCustomerId: "cust_003",
          purchaserCustomerName: "Alex Rivera",
          purchasedForCustomerIds: ["cust_003"],
          transactionType: "sale",
          returnStatus: "none",
          items: [
            {
              productId: "prd_005",
              productName: "Camp Registration",
              category: "memberships",
              type: "membership",
              quantity: 1,
              unitPrice: 45,
              lineTotal: 45
            }
          ],
          subtotal: 45,
          total: 45,
          paymentType: "card",
          completedAt: "2026-05-11T14:10:00Z",
          checkInTriggered: false,
          receiptNumber: "R-MEM1"
        }
      ])
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders membership detail fields and progress", () => {
    render(
      <TestProviders>
        <MembershipDetailPage />
      </TestProviders>
    );

    expect(screen.getByText("Membership Overview")).toBeInTheDocument();
    expect(screen.getByLabelText("digital-membership-card")).toBeInTheDocument();
    expect(screen.getByText(/Auto-renew:/i)).toBeInTheDocument();
    expect(screen.getByText(/Billing frequency:/i)).toBeInTheDocument();
    expect(screen.getByText(/Next renewal date:/i)).toBeInTheDocument();
    expect(screen.getByText(/Days remaining:/i)).toBeInTheDocument();
    expect(screen.getByText("Time remaining")).toBeInTheDocument();
  });

  it("shows household assignments and receipt links", () => {
    render(
      <TestProviders>
        <MembershipDetailPage />
      </TestProviders>
    );

    expect(screen.getByText("Associated household members")).toBeInTheDocument();
    expect(screen.getByText("Oslo Fisher")).toBeInTheDocument();
    expect(screen.getByText("Related Receipts")).toBeInTheDocument();
    const receiptLink = screen.getByRole("link", { name: "View Receipt" });
    expect(receiptLink).toHaveAttribute("href", "/p/summit/purchases/txn_mem_renewal");
  });

  it("memberships list links to membership details", () => {
    params = { orgSlug: "summit", membershipId: "mem_001" };
    setCustomerSession("cust_001");
    render(
      <TestProviders>
        <MembershipsPage />
      </TestProviders>
    );

    expect(screen.getByRole("link", { name: "View membership details" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View membership card" })).toBeInTheDocument();
  });
});
