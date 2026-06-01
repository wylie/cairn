import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CustomerPortalHouseholdPage from "@/app/p/[orgSlug]/household/page";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/p/summit/household",
  useParams: () => ({ orgSlug: "summit" })
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

describe("customer portal household", () => {
  beforeEach(() => {
    setCustomerSession("cust_003");
  });

  it("shows household metrics and member cards", () => {
    render(
      <TestProviders>
        <CustomerPortalHouseholdPage />
      </TestProviders>
    );

    expect(screen.getByText("Most active member")).toBeInTheDocument();
    expect(screen.getByText("Total visits this month")).toBeInTheDocument();
    expect(screen.getByText("Total programs attended")).toBeInTheDocument();
    expect(screen.getByText("Household spending this year")).toBeInTheDocument();
    expect(screen.getByText("Sam Noaccess")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Sign waiver" }).length).toBeGreaterThan(0);
  });

  it("guardian only sees their own household members", () => {
    render(
      <TestProviders>
        <CustomerPortalHouseholdPage />
      </TestProviders>
    );

    expect(screen.getAllByText("Alex Rivera").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sam Noaccess").length).toBeGreaterThan(0);
    expect(screen.queryByText("Jimbo James")).not.toBeInTheDocument();
  });

  it("customer without household membership sees safe empty state", () => {
    setCustomerSession("cust_005");
    render(
      <TestProviders>
        <CustomerPortalHouseholdPage />
      </TestProviders>
    );

    expect(screen.getByText("No Household Found")).toBeInTheDocument();
  });
});
