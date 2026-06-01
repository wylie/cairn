import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CustomerPortalDashboardPage from "@/app/p/[orgSlug]/dashboard/page";
import CustomerPortalMembershipsPage from "@/app/p/[orgSlug]/memberships/page";
import CustomerPortalRegistrationsPage from "@/app/p/[orgSlug]/registrations/page";
import CustomerPortalWaiversPage from "@/app/p/[orgSlug]/waivers/page";
import CustomerPortalPurchasesPage from "@/app/p/[orgSlug]/purchases/page";
import CustomerPortalHouseholdPage from "@/app/p/[orgSlug]/household/page";
import CustomerLoginPage from "@/app/p/login/page";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  }),
  usePathname: () => "/p/summit/dashboard",
  useParams: () => ({ orgSlug: "summit" })
}));

function setCustomerSessionCookie() {
  const payload = {
    kind: "customer",
    userId: "cust_auth_002",
    email: "alex.rivera@example.com",
    organizationSlugs: ["summit"],
    customerId: "cust_003"
  };
  const encoded = btoa(JSON.stringify(payload)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  document.cookie = `cairn_mock_auth=${encoded}; path=/`;
}

describe("customer portal", () => {
  beforeEach(() => {
    setCustomerSessionCookie();
  });

  it("renders dashboard cards for customer portal", () => {
    render(
      <TestProviders>
        <CustomerPortalDashboardPage />
      </TestProviders>
    );
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    expect(screen.getByText("Active Memberships")).toBeInTheDocument();
    expect(screen.getAllByText("Upcoming Programs").length).toBeGreaterThan(0);
    expect(screen.getByText("Membership Summary")).toBeInTheDocument();
    expect(screen.getByText("Household Visits This Month")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register for Program" })).toBeInTheDocument();
  });

  it("shows household portal content and member rows", () => {
    render(
      <TestProviders>
        <CustomerPortalHouseholdPage />
      </TestProviders>
    );
    expect(screen.getByText("Household")).toBeInTheDocument();
    expect(screen.getAllByText(/Relationship:/i).length).toBeGreaterThan(0);
  });

  it("renders membership, registration, waiver, and receipt sections", () => {
    render(
      <TestProviders>
        <CustomerPortalMembershipsPage />
        <CustomerPortalRegistrationsPage />
        <CustomerPortalWaiversPage />
        <CustomerPortalPurchasesPage />
      </TestProviders>
    );
    expect(screen.getByText("Memberships")).toBeInTheDocument();
    expect(screen.getByText("Program Registrations")).toBeInTheDocument();
    expect(screen.getByText("Waivers")).toBeInTheDocument();
    expect(screen.getByText("Purchase History")).toBeInTheDocument();
  });

  it("customer login supports email/password and shows reset placeholder", async () => {
    const user = userEvent.setup();
    render(<CustomerLoginPage />);
    expect(screen.getByText("Customer Portal Login")).toBeInTheDocument();
    expect(screen.getByText(/Password reset placeholder/i)).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "maya.patel@example.com");
    expect(screen.getByDisplayValue("maya.patel@example.com")).toBeInTheDocument();
  });
});
