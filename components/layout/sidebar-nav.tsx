import { memo } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, ScanLine, Calendar, Boxes, CreditCard, BarChart3, Settings, Tags, UserCog, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StaffPermission } from "@/types/domain";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users, permissions: ["viewCustomers"] as StaffPermission[] },
  { href: "/check-in", label: "Check-in", icon: ScanLine },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/registrations", label: "Registrations", icon: ClipboardList, permissions: ["rosterAccess", "editPrograms"] as StaffPermission[] },
  { href: "/programs", label: "Programs", icon: Boxes, permissions: ["editPrograms", "rosterAccess"] as StaffPermission[] },
  { href: "/products", label: "Products", icon: Tags, permissions: ["manageProducts"] as StaffPermission[] },
  { href: "/pos", label: "POS", icon: CreditCard, permissions: ["usePOS"] as StaffPermission[] },
  { href: "/reports", label: "Reports", icon: BarChart3, permissions: ["viewReports", "viewAttendanceReports", "viewFinancialReports"] as StaffPermission[] },
  { href: "/staff", label: "Staff", icon: UserCog, permissions: ["manageStaff", "inviteStaff", "manageRoles"] as StaffPermission[] },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    permissions: ["manageSettings", "manageStaff", "manageProducts"] as StaffPermission[]
  }
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
  canAccessPermissions
}: {
  pathname: string;
  currentOrgSlug?: string;
  canAccessPermissions?: (permissions?: StaffPermission[]) => boolean;
}) {
  const visibleItems = navItems.filter((item) => (canAccessPermissions ? canAccessPermissions(item.permissions) : true));
  return (
    <nav className="space-y-1">
      {visibleItems.map((item) => {
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
    </nav>
  );
}

export const SidebarNav = memo(SidebarNavInner);
