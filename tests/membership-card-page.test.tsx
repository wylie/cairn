import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MembershipCardPage from "@/app/p/[orgSlug]/membership-card/page";
import { DigitalMembershipCard } from "@/components/memberships/digital-membership-card";
import { TestProviders } from "@/tests/test-providers";

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useParams: () => ({ orgSlug: "summit" }),
  usePathname: () => "/p/summit/membership-card",
  useSearchParams: () => searchParams
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

describe("membership card page", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    setCustomerSession("cust_003");
  });

  it("renders portal card access for household members", () => {
    render(
      <TestProviders>
        <MembershipCardPage />
      </TestProviders>
    );

    expect(screen.getByText("Membership Card")).toBeInTheDocument();
    expect(screen.getByLabelText("digital-membership-card")).toBeInTheDocument();
    expect(screen.getByText("Choose a Card")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alex Rivera" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sam Noaccess" })).toBeInTheDocument();
  });

  it("allows viewing a dependent card through authorized household scope", () => {
    searchParams = new URLSearchParams("customerId=cust_004");
    render(
      <TestProviders>
        <MembershipCardPage />
      </TestProviders>
    );

    expect(screen.getByText("Dependent card")).toBeInTheDocument();
    expect(screen.getByText(/Sam Noaccess/i)).toBeInTheDocument();
  });

  it("renders expired card state clearly", () => {
    render(
      <DigitalMembershipCard
        customer={{ firstName: "Dana", lastName: "Cole", profilePhotoUrl: "" }}
        accessRecord={{ status: "expired", startDate: "2026-01-01", expirationDate: "2026-02-01" }}
        membershipName="Annual Membership"
        organizationName="Summit Rec Collective"
        membershipNumber="SUM-TEST-123456"
        qrToken="CM-TESTTOKEN"
      />
    );

    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("Summit Rec Collective")).toBeInTheDocument();
    expect(screen.getByText("Access Token")).toBeInTheDocument();
    expect(screen.getByText(/Visual placeholder for future QR scanning/i)).toBeInTheDocument();
  });
});
