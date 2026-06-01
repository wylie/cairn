import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import DashboardPage from "@/app/(app)/dashboard/page";
import { PublicAnalytics, getPublicAnalyticsConfig, shouldLoadPublicAnalytics } from "@/components/public/public-analytics";
import { TestProviders } from "@/tests/test-providers";

describe("Public homepage", () => {
  it("renders without auth dependency and includes facility and staff CTAs", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Modern facility operations software/i
    );
    expect(screen.getAllByRole("link", { name: /Explore Demo Facility/i })[0]).toHaveAttribute("href", "/f/summit");
    expect(screen.getAllByRole("link", { name: /Staff Login/i })[0]).toHaveAttribute("href", "/login");
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
