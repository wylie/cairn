import { memo } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, ScanLine, Calendar, Boxes, CreditCard, BarChart3, Settings, Tags, UserCog, ClipboardList, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StaffPermission } from "@/types/domain";

type NavSection = "operations" | "management";
type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  section: NavSection;
  permissions?: StaffPermission[];
  isVisible?: (ctx: {
    canAccessPermissions?: (permissions?: StaffPermission[]) => boolean;
    hasPermission?: (permission: StaffPermission) => boolean;
  }) => boolean;
};

const operationalPermissions: StaffPermission[] = ["checkInCustomer", "checkOutCustomer", "viewCustomers", "usePOS", "rosterAccess", "editPrograms"];

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "operations", permissions: operationalPermissions },
  { href: "/check-in", label: "Check-in", icon: ScanLine, section: "operations", permissions: ["checkInCustomer", "checkOutCustomer"] },
  { href: "/customers", label: "Customers", icon: Users, section: "operations", permissions: ["viewCustomers"] },
  { href: "/calendar", label: "Calendar", icon: Calendar, section: "operations", permissions: ["rosterAccess", "editPrograms", "checkInCustomer"] },
  { href: "/registrations", label: "Registrations", icon: ClipboardList, section: "operations", permissions: ["rosterAccess", "editPrograms"] },
  { href: "/pos", label: "POS", icon: CreditCard, section: "operations", permissions: ["usePOS"] },
  {
    href: "/programs",
    label: "Programs",
    icon: Boxes,
    section: "management",
    permissions: ["editPrograms"],
    // Front desk often has limited roster permissions; keep program setup scoped to instructor/manager-level capabilities.
    isVisible: ({ hasPermission, canAccessPermissions }) => {
      const canEditPrograms = hasPermission
        ? hasPermission("editPrograms")
        : canAccessPermissions
          ? canAccessPermissions(["editPrograms"])
          : true;
      const isFrontDeskOnly =
        Boolean(hasPermission?.("usePOS")) &&
        !Boolean(hasPermission?.("manageStaff")) &&
        !Boolean(hasPermission?.("manageSettings")) &&
        !Boolean(hasPermission?.("cancelPrograms"));
      return canEditPrograms && !isFrontDeskOnly;
    }
  },
  { href: "/products", label: "Products", icon: Tags, section: "management", permissions: ["manageProducts"] },
  { href: "/waivers", label: "Waivers", icon: FileCheck2, section: "management", permissions: ["manageWaivers"] },
  { href: "/reports", label: "Reports", icon: BarChart3, section: "management", permissions: ["viewReports", "viewAttendanceReports", "viewFinancialReports"] },
  { href: "/staff", label: "Staff", icon: UserCog, section: "management", permissions: ["manageStaff", "inviteStaff", "manageRoles"] },
  { href: "/settings", label: "Settings", icon: Settings, section: "management", permissions: ["manageSettings", "manageStaff", "manageProducts"] }
];

function buildOrgHref(pathname: string, href: string) {
  const match = pathname.match(/^\/o\/([^/]+)/);
  const slug = match?.[1];
  if (!slug) return href;
  return `/o/${slug}${href}`;
}

function SidebarNavInner({
  pathname,
  currentOrgSlug,
  canAccessPermissions,
  hasPermission
}: {
  pathname: string;
  currentOrgSlug?: string;
  canAccessPermissions?: (permissions?: StaffPermission[]) => boolean;
  hasPermission?: (permission: StaffPermission) => boolean;
}) {
  const visibleItems = navItems.filter((item) => {
    const permissionVisible = canAccessPermissions ? canAccessPermissions(item.permissions) : true;
    const customVisible = item.isVisible ? item.isVisible({ canAccessPermissions, hasPermission }) : true;
    return permissionVisible && customVisible;
  });
  const operations = visibleItems.filter((item) => item.section === "operations");
  const management = visibleItems.filter((item) => item.section === "management");

  const renderGroup = (heading: string, items: NavItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{heading}</p>
        {items.map((item) => {
          const orgHref = currentOrgSlug ? `/o/${currentOrgSlug}${item.href}` : buildOrgHref(pathname, item.href);
          const isActive =
            pathname === item.href ||
            Boolean(pathname?.startsWith(`${item.href}/`)) ||
            pathname === orgHref ||
            Boolean(pathname?.startsWith(`${orgHref}/`));
          return (
            <Link
              key={item.href}
              href={orgHref}
              prefetch
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <nav className="space-y-1">
      {renderGroup("Operations", operations)}
      {renderGroup("Management", management)}
    </nav>
  );
}

export const SidebarNav = memo(SidebarNavInner);
