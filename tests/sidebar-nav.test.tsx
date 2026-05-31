import { render, screen } from "@testing-library/react";
import { SidebarNav } from "@/components/layout/sidebar-nav";

describe("SidebarNav", () => {
  it("renders expected primary navigation links", () => {
    render(<SidebarNav pathname="/dashboard" />);

    ["Dashboard", "Customers", "Check-in", "Calendar", "Registrations", "Programs", "Products", "POS", "Reports", "Staff", "Settings"].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
  });

  it("prefixes links with organization slug when provided", () => {
    render(<SidebarNav pathname="/o/summit/dashboard" currentOrgSlug="summit" />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/o/summit/dashboard");
    expect(screen.getByRole("link", { name: "Customers" })).toHaveAttribute("href", "/o/summit/customers");
    expect(screen.getByRole("link", { name: "Registrations" })).toHaveAttribute("href", "/o/summit/registrations");
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("href", "/o/summit/reports");
  });
});
