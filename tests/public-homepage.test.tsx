import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import DashboardPage from "@/app/(app)/dashboard/page";
import { PublicAnalytics, getPublicAnalyticsConfig, shouldLoadPublicAnalytics } from "@/components/public/public-analytics";
import { TestProviders } from "@/tests/test-providers";

describe("Public homepage", () => {
  it("renders without auth dependency and includes marketing CTAs", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Cairn");
    expect(screen.getAllByText(/Built by Stone Cairn/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Simple pricing that grows with your organization/i)).toBeInTheDocument();
    expect(screen.getByText(/What we don/i)).toBeInTheDocument();
    expect(screen.getByText(/No feature gating/i)).toBeInTheDocument();
    expect(screen.getByText(/30-day trial/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Start Free Trial/i })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Start Free Trial/i })).toHaveAttribute("href", "/request-demo?intent=trial");
    expect(screen.getAllByRole("link", { name: /Request Live Demo/i })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Request Live Demo/i })).toHaveAttribute("href", "/request-demo");
    expect(screen.getAllByRole("link", { name: /Explore Demo Facility/i })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Explore Demo Facility/i })).toHaveAttribute("href", "/f/summit");
    expect(screen.getAllByRole("link", { name: /Contact Us/i }).map((link) => link.getAttribute("href"))).toEqual(
      expect.arrayContaining(["mailto:hello@stonecairn.app", "mailto:support@stonecairn.app"])
    );
    expect(screen.getByText(/Need support for a larger organization/i)).toBeInTheDocument();
    expect(screen.queryByText(/Starting at \$599/i)).not.toBeInTheDocument();
    expect(screen.getByText(/An Argon Collective LLC company/i)).toBeInTheDocument();
    expect(screen.getByText(/© 2026 Argon Collective LLC/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Staff Login/i })).not.toBeInTheDocument();
  });

  it("analytics boundary only loads when GA id exists", () => {
    expect(shouldLoadPublicAnalytics(undefined)).toBe(false);
    expect(shouldLoadPublicAnalytics("G-TEST123")).toBe(true);
  });

  it("analytics does not render when GA id is missing", () => {
    const { container } = render(<PublicAnalytics />);
    expect(container.querySelector("script")).toBeNull();
  });

  it("homepage can render analytics scripts when GA id exists", async () => {
    const config = getPublicAnalyticsConfig("G-TEST123");
    expect(config).toEqual({
      scriptSrc: "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
      inlineId: "ga-init"
    });
  });

  it("protected app pages do not load public analytics", () => {
    const { container } = render(
      <TestProviders>
        <DashboardPage />
      </TestProviders>
    );
    expect(container.innerHTML).not.toContain("googletagmanager");
  });
});
