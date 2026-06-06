import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RentalsPage from "@/app/(app)/rentals/page";
import CustomerPortalRentalsPage from "@/app/p/[orgSlug]/rentals/page";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/o/summit/rentals",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ orgSlug: "summit" })
}));

describe("rentals and reservations", () => {
  beforeEach(() => {
    const session = btoa(JSON.stringify({
      kind: "staff",
      userId: "auth_owner_summit",
      email: "taylor@summitrec.co",
      organizationSlugs: ["summit"]
    }));
    document.cookie = `cairn_mock_auth=${session}; path=/`;
  });

  it("renders the staff rentals workspace", () => {
    render(
      <TestProviders>
        <RentalsPage />
      </TestProviders>
    );

    expect(screen.getByTestId("rentals-page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Reservation" })).toBeInTheDocument();
    expect(screen.getByText("Reservations")).toBeInTheDocument();
  });

  it("renders the customer rentals portal", () => {
    render(
      <TestProviders>
        <CustomerPortalRentalsPage />
      </TestProviders>
    );

    expect(screen.getByTestId("customer-rentals-page")).toBeInTheDocument();
    expect(screen.getByText("Browse Resources")).toBeInTheDocument();
    expect(screen.getByText("Make Reservation")).toBeInTheDocument();
  });
});
