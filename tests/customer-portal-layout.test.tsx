import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CustomerPortalDashboardPage from "@/app/p/[orgSlug]/dashboard/page";
import CustomerPortalPurchasesPage from "@/app/p/[orgSlug]/purchases/page";
import PublicProgramsPage from "@/app/p/[orgSlug]/programs/page";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  useParams: () => ({ orgSlug: "summit" }),
  usePathname: () => "/p/summit/dashboard",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

describe("customer portal layout container", () => {
  it("dashboard uses the shared portal container", () => {
    render(
      <TestProviders>
        <CustomerPortalDashboardPage />
      </TestProviders>
    );
    const container = screen.getByTestId("customer-portal-container");
    expect(container.className).toContain("max-w-6xl");
  });

  it("purchases uses the shared portal container", () => {
    render(
      <TestProviders>
        <CustomerPortalPurchasesPage />
      </TestProviders>
    );
    const container = screen.getByTestId("customer-portal-container");
    expect(container.className).toContain("max-w-6xl");
  });

  it("program catalog uses the shared portal container", async () => {
    const Page = await PublicProgramsPage({ params: Promise.resolve({ orgSlug: "summit" }) });
    render(Page);
    const container = screen.getByTestId("customer-portal-container");
    expect(container.className).toContain("max-w-6xl");
  });
});

