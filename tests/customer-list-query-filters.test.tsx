import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { CustomerList } from "@/components/customers/customer-list";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/customers",
  useSearchParams: () => new URLSearchParams(window.location.search)
}));

describe("CustomerList query filters", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/customers");
  });

  it("applies waiver missing filter from query params", () => {
    window.history.pushState({}, "", "/customers?waiver=missing");
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    expect(screen.getByText("Waiver Status: Missing")).toBeInTheDocument();
  });

  it("applies birthday today filter from query params", () => {
    window.history.pushState({}, "", "/customers?birthday=today");
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    expect(screen.getByText("Birthday: Today")).toBeInTheDocument();
  });
});
