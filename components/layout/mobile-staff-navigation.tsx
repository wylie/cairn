"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Menu, Plus, X } from "lucide-react";
import { buildOrgHref, getVisibleNavItems } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import type { StaffPermission } from "@/types/domain";
import { cn } from "@/lib/utils";

type QuickAction = {
  href: string;
  label: string;
  permissions?: StaffPermission[];
};

const primaryMobileItems = ["/dashboard", "/check-in", "/calendar", "/pos"];

function getQuickActions(pathname: string): QuickAction[] {
  if (pathname.includes("/check-in")) {
    return [
      { href: "/check-in", label: "Check In Customer", permissions: ["checkInCustomer"] },
      { href: "/customers", label: "View Customer", permissions: ["viewCustomers"] },
      { href: "/waivers", label: "Sign Waiver", permissions: ["manageWaivers"] }
    ];
  }
  if (pathname.includes("/registrations")) {
    return [
      { href: "/registrations", label: "Create Registration", permissions: ["rosterAccess", "editPrograms"] },
      { href: "/calendar", label: "Create Session", permissions: ["editPrograms"] },
      { href: "/customers", label: "View Customer", permissions: ["viewCustomers"] }
    ];
  }
  if (pathname.includes("/calendar")) {
    return [
      { href: "/calendar", label: "Today’s Sessions", permissions: ["rosterAccess", "editPrograms", "checkInCustomer"] },
      { href: "/registrations", label: "Take Attendance", permissions: ["rosterAccess"] },
      { href: "/waivers", label: "Sign Waiver", permissions: ["manageWaivers"] }
    ];
  }
  if (pathname.includes("/dashboard")) {
    return [
      { href: "/check-in", label: "Check In Customer", permissions: ["checkInCustomer"] },
      { href: "/alerts", label: "Resolve Alert", permissions: ["checkInCustomer", "viewCustomers", "viewReports"] },
      { href: "/reports", label: "Run Report", permissions: ["viewReports", "viewAttendanceReports", "viewFinancialReports"] }
    ];
  }
  return [
    { href: "/check-in", label: "Check In Customer", permissions: ["checkInCustomer"] },
    { href: "/pos", label: "Sell Access", permissions: ["usePOS"] },
    { href: "/registrations", label: "Create Registration", permissions: ["rosterAccess", "editPrograms"] }
  ];
}

export function MobileStaffNavigation({
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
  const [navOpen, setNavOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const visibleItems = useMemo(
    () => getVisibleNavItems({ canAccessPermissions, hasPermission }),
    [canAccessPermissions, hasPermission]
  );
  const bottomItems = visibleItems.filter((item) => primaryMobileItems.includes(item.href)).slice(0, 4);
  const quickActions = getQuickActions(pathname).filter((action) =>
    canAccessPermissions ? canAccessPermissions(action.permissions) : true
  );

  return (
    <>
      <div className="lg:hidden" data-testid="mobile-staff-navigation">
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
            {bottomItems.map((item) => {
              const href = currentOrgSlug ? `/o/${currentOrgSlug}${item.href}` : buildOrgHref(pathname, item.href);
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "flex min-h-12 flex-1 flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-medium",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="mb-1 h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 rounded-xl px-3"
              aria-label={navOpen ? "Close mobile menu" : "Open mobile menu"}
              onClick={() => setNavOpen((prev) => !prev)}
            >
              {navOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </div>
        </div>

        <div className="fixed bottom-24 right-4 z-40">
          <Button
            type="button"
            className="min-h-14 rounded-full px-4 shadow-lg"
            aria-label={actionsOpen ? "Close quick actions" : "Open quick actions"}
            onClick={() => setActionsOpen((prev) => !prev)}
          >
            {actionsOpen ? <X className="mr-2 h-4 w-4" aria-hidden="true" /> : <Plus className="mr-2 h-4 w-4" aria-hidden="true" />}
            Quick Actions
          </Button>
          {actionsOpen ? (
            <div className="mt-3 w-64 space-y-2 rounded-2xl border bg-card p-3 shadow-xl" data-testid="mobile-quick-actions">
              {quickActions.map((action) => {
                const href = currentOrgSlug ? `/o/${currentOrgSlug}${action.href}` : buildOrgHref(pathname, action.href);
                return (
                  <Link
                    key={`${action.href}-${action.label}`}
                    href={href}
                    className="flex min-h-12 items-center rounded-xl border px-3 text-sm font-medium hover:bg-secondary"
                    onClick={() => setActionsOpen(false)}
                  >
                    {action.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        {navOpen ? (
          <div className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm" onClick={() => setNavOpen(false)}>
            <div
              className="absolute inset-x-3 bottom-24 rounded-2xl border bg-card p-4 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Staff Navigation</p>
                <Button type="button" variant="secondary" className="min-h-10" onClick={() => setNavOpen(false)}>
                  Close
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {visibleItems.map((item) => {
                  const href = currentOrgSlug ? `/o/${currentOrgSlug}${item.href}` : buildOrgHref(pathname, item.href);
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm font-medium",
                        isActive ? "border-primary bg-primary/5" : "hover:bg-secondary"
                      )}
                      onClick={() => setNavOpen(false)}
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

