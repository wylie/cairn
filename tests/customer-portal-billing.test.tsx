import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CustomerPortalBillingPage from "@/app/p/[orgSlug]/billing/page";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  useParams: () => ({ orgSlug: "summit" }),
  usePathname: () => "/p/summit/billing",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
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

describe("customer portal billing", () => {
  beforeEach(() => {
    setCustomerSession("cust_003");
  });

  it("shows household-scoped billing records only", () => {
    render(
      <TestProviders>
        <CustomerPortalBillingPage />
      </TestProviders>
    );

    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByLabelText("portal-billing-invoices-section")).toHaveTextContent("INV-2026-014");
    expect(screen.getByLabelText("portal-billing-statements-section")).toHaveTextContent("STMT-2026-001");
    expect(screen.queryByText("INV-2026-021")).not.toBeInTheDocument();
  });
});
