import { render, screen } from "@testing-library/react";
import { SidebarNav } from "@/components/layout/sidebar-nav";

describe("SidebarNav", () => {
  it("renders expected primary navigation links", () => {
    render(<SidebarNav pathname="/dashboard" />);

    ["Dashboard", "Customers", "Check-in", "Calendar", "Programs", "POS", "Reports", "Settings"].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
  });
});
