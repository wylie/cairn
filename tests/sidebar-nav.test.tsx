import { render, screen } from "@testing-library/react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { StaffPermission } from "@/types/domain";

function buildPermissionHelpers(granted: StaffPermission[]) {
  const hasPermission = (permission: StaffPermission) => granted.includes(permission);
  const canAccessPermissions = (permissions?: StaffPermission[]) => {
    if (!permissions || permissions.length === 0) return true;
    return permissions.some((permission) => granted.includes(permission));
  };
  return { hasPermission, canAccessPermissions };
}

describe("SidebarNav", () => {
  it("renders grouped navigation headings", () => {
    render(<SidebarNav pathname="/dashboard" />);

    ["Dashboard", "Customers", "Programs", "Operations", "Management"].forEach((label) => {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    });
    ["Dashboard", "Alerts", "Customers", "Households", "Communications", "Memberships", "Billing", "Check-In", "Calendar", "Rentals", "Registrations", "Programs", "Products", "Waivers", "Integrations", "POS", "Reports & Analytics", "Staff", "Settings"].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
  });

  it("prefixes links with organization slug when provided", () => {
    render(<SidebarNav pathname="/o/summit/dashboard" currentOrgSlug="summit" />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/o/summit/dashboard");
    expect(screen.getByRole("link", { name: "Alerts" })).toHaveAttribute("href", "/o/summit/alerts");
    expect(screen.getByRole("link", { name: "Customers" })).toHaveAttribute("href", "/o/summit/customers");
    expect(screen.getByRole("link", { name: "Households" })).toHaveAttribute("href", "/o/summit/households");
    expect(screen.getByRole("link", { name: "Communications" })).toHaveAttribute("href", "/o/summit/communications");
    expect(screen.getByRole("link", { name: "Memberships" })).toHaveAttribute("href", "/o/summit/memberships");
    expect(screen.getByRole("link", { name: "Billing" })).toHaveAttribute("href", "/o/summit/billing");
    expect(screen.getByRole("link", { name: "Rentals" })).toHaveAttribute("href", "/o/summit/rentals");
    expect(screen.getByRole("link", { name: "Registrations" })).toHaveAttribute("href", "/o/summit/registrations");
    expect(screen.getByRole("link", { name: "Integrations" })).toHaveAttribute("href", "/o/summit/integrations");
    expect(screen.getByRole("link", { name: "Reports & Analytics" })).toHaveAttribute("href", "/o/summit/reports");
  });

  it("shows front desk operational pages and hides administrative pages", () => {
    const { canAccessPermissions, hasPermission } = buildPermissionHelpers([
      "viewCustomers",
      "checkInCustomer",
      "checkOutCustomer",
      "usePOS",
      "rosterAccess",
      "manageRentals",
      "sendTransactionalMessages"
    ]);
    render(
      <SidebarNav
        pathname="/o/summit/dashboard"
        currentOrgSlug="summit"
        canAccessPermissions={canAccessPermissions}
        hasPermission={hasPermission}
      />
    );

    ["Dashboard", "Alerts", "Check-In", "Customers", "Households", "Communications", "Memberships", "Calendar", "Rentals", "Registrations", "POS"].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
    ["Products", "Waivers", "Staff", "Settings", "Programs", "Billing", "Integrations"].forEach((label) => {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    });
  });

  it("shows instructor calendar/registration/program pages and hides POS/admin pages", () => {
    const { canAccessPermissions, hasPermission } = buildPermissionHelpers(["editPrograms", "rosterAccess", "messageAssignedParticipants"]);
    render(
      <SidebarNav
        pathname="/o/summit/calendar"
        currentOrgSlug="summit"
        canAccessPermissions={canAccessPermissions}
        hasPermission={hasPermission}
      />
    );

    ["Dashboard", "Alerts", "Calendar", "Registrations", "Programs"].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
    ["POS", "Products", "Waivers", "Staff", "Settings", "Memberships", "Billing", "Rentals", "Integrations"].forEach((label) => {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    });
  });

  it("shows full navigation for manager/owner-level permissions", () => {
    const { canAccessPermissions, hasPermission } = buildPermissionHelpers([
      "viewCustomers",
      "checkInCustomer",
      "checkOutCustomer",
      "usePOS",
      "rosterAccess",
      "editPrograms",
      "cancelPrograms",
      "manageProducts",
      "manageWaivers",
      "viewReports",
      "viewFinancialReports",
      "manageStaff",
      "manageRoles",
      "manageSettings",
      "manageBillingSettings",
      "managePlatformSettings",
      "manageRentals",
      "manageCommunications"
    ]);
    render(
      <SidebarNav
        pathname="/o/summit/dashboard"
        currentOrgSlug="summit"
        canAccessPermissions={canAccessPermissions}
        hasPermission={hasPermission}
      />
    );
    ["Dashboard", "Alerts", "Check-In", "Customers", "Households", "Communications", "Memberships", "Billing", "Calendar", "Rentals", "Registrations", "POS", "Programs", "Products", "Waivers", "Integrations", "Reports & Analytics", "Staff", "Settings"].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
  });

  it("highlights only one active item for detail routes", () => {
    const { container } = render(<SidebarNav pathname="/o/summit/customers/cust_001" currentOrgSlug="summit" />);
    expect(screen.getByRole("link", { name: "Customers" })).toHaveClass("bg-primary");
    expect(container.querySelectorAll("a.bg-primary")).toHaveLength(1);
  });

  it("does not activate partial sibling route matches", () => {
    const { container } = render(<SidebarNav pathname="/o/summit/products" currentOrgSlug="summit" />);
    expect(screen.getByRole("link", { name: "Products" })).toHaveClass("bg-primary");
    expect(screen.getByRole("link", { name: "POS" })).not.toHaveClass("bg-primary");
    expect(container.querySelectorAll("a.bg-primary")).toHaveLength(1);
  });
});
