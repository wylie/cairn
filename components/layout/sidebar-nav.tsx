import { memo } from "react";
import Link from "next/link";
import { LayoutDashboard, Bell, Home, Users, ScanLine, Calendar, Boxes, CreditCard, BarChart3, Settings, Tags, UserCog, ClipboardList, FileCheck2, ShieldCheck, MessagesSquare, TentTree, PlugZap, ScrollText, Map } from "lucide-react";
import { getActiveRouteHref } from "@/lib/navigation/route-matching";
import { cn } from "@/lib/utils";
import type { StaffPermission } from "@/types/domain";

type NavSection = "dashboard" | "customers" | "programs" | "operations" | "management";
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

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "dashboard", permissions: operationalPermissions },
  { href: "/alerts", label: "Alerts", icon: Bell, section: "dashboard", permissions: operationalPermissions },
  { href: "/customers", label: "Customers", icon: Users, section: "customers", permissions: ["viewCustomers"] },
  { href: "/households", label: "Households", icon: Home, section: "customers", permissions: ["viewCustomers"] },
  { href: "/memberships", label: "Memberships", icon: ShieldCheck, section: "customers", permissions: ["viewCustomers", "viewMembershipReports"] },
  { href: "/check-in", label: "Check-In", icon: ScanLine, section: "customers", permissions: ["checkInCustomer", "checkOutCustomer"] },
  {
    href: "/communications",
    label: "Communications",
    icon: MessagesSquare,
    section: "customers",
    permissions: ["manageCommunications", "sendTransactionalMessages", "messageAssignedParticipants"],
    isVisible: ({ hasPermission, canAccessPermissions }) =>
      (!hasPermission && !canAccessPermissions) ||
      Boolean(
        hasPermission?.("manageCommunications") ||
          hasPermission?.("sendTransactionalMessages") ||
          hasPermission?.("messageAssignedParticipants") ||
          canAccessPermissions?.(["manageCommunications", "sendTransactionalMessages", "messageAssignedParticipants"])
      )
  },
  { href: "/calendar", label: "Calendar", icon: Calendar, section: "programs", permissions: ["rosterAccess", "editPrograms", "checkInCustomer"] },
  { href: "/registrations", label: "Registrations", icon: ClipboardList, section: "programs", permissions: ["rosterAccess", "editPrograms"] },
  { href: "/rentals", label: "Rentals", icon: TentTree, section: "programs", permissions: ["manageRentals"] },
  { href: "/pos", label: "POS", icon: CreditCard, section: "operations", permissions: ["usePOS"] },
  {
    href: "/programs",
    label: "Programs",
    icon: Boxes,
    section: "programs",
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
  { href: "/products", label: "Products", icon: Tags, section: "operations", permissions: ["manageProducts"] },
  { href: "/waivers", label: "Waivers", icon: FileCheck2, section: "operations", permissions: ["manageWaivers"] },
  { href: "/billing", label: "Billing", icon: CreditCard, section: "operations", permissions: ["manageBillingSettings", "viewFinancialReports"] },
  { href: "/staff", label: "Staff", icon: UserCog, section: "management", permissions: ["manageStaff", "inviteStaff", "manageRoles"] },
  { href: "/reports", label: "Reports & Analytics", icon: BarChart3, section: "management", permissions: ["viewReports", "viewAttendanceReports", "viewFinancialReports"] },
  { href: "/integrations", label: "Integrations", icon: PlugZap, section: "management", permissions: ["managePlatformSettings"] },
  { href: "/release-notes", label: "Release Notes", icon: ScrollText, section: "management", permissions: operationalPermissions },
  { href: "/roadmap", label: "Roadmap", icon: Map, section: "management", permissions: operationalPermissions },
  { href: "/settings", label: "Settings", icon: Settings, section: "management", permissions: ["manageSettings", "manageStaff", "manageProducts"] }
];

const navSections: { id: NavSection; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "customers", label: "Customers" },
  { id: "programs", label: "Programs" },
  { id: "operations", label: "Operations" },
  { id: "management", label: "Management" }
];

export function buildOrgHref(pathname: string, href: string) {
  const match = pathname.match(/^\/o\/([^/]+)/);
  const slug = match?.[1];
  if (!slug) return href;
  return `/o/${slug}${href}`;
}

export function getVisibleNavItems({
  canAccessPermissions,
  hasPermission
}: {
  canAccessPermissions?: (permissions?: StaffPermission[]) => boolean;
  hasPermission?: (permission: StaffPermission) => boolean;
}) {
  return navItems.filter((item) => {
    const permissionVisible = canAccessPermissions ? canAccessPermissions(item.permissions) : true;
    const customVisible = item.isVisible ? item.isVisible({ canAccessPermissions, hasPermission }) : true;
    return permissionVisible && customVisible;
  });
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
  const visibleItems = getVisibleNavItems({ canAccessPermissions, hasPermission });
  const activeHref = getActiveRouteHref(
    pathname,
    visibleItems.map((item) => ({ href: currentOrgSlug ? `/o/${currentOrgSlug}${item.href}` : buildOrgHref(pathname, item.href) }))
  );

  const renderGroup = (section: { id: NavSection; label: string }) => {
    const items = visibleItems.filter((item) => item.section === section.id);
    if (items.length === 0) return null;
    const headingId = `sidebar-nav-${section.id}`;

    return (
      <section key={section.id} aria-labelledby={headingId} className="space-y-1.5">
        <h2 id={headingId} className="px-3 text-xs font-semibold text-foreground/75">
          {section.label}
        </h2>
        {items.map((item) => {
          const orgHref = currentOrgSlug ? `/o/${currentOrgSlug}${item.href}` : buildOrgHref(pathname, item.href);
          const isActive = activeHref === orgHref;
          return (
            <Link
              key={item.href}
              href={orgHref}
              prefetch
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </section>
    );
  };

  return (
    <nav className="space-y-5" aria-label="Primary navigation">
      {navSections.map((section) => renderGroup(section))}
    </nav>
  );
}

export const SidebarNav = memo(SidebarNavInner);
