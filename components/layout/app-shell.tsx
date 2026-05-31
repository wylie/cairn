"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";
import { DevPerfMonitor } from "@/components/dev/dev-perf-monitor";
import { data } from "@/lib/data";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type { StaffPermission } from "@/types/domain";
import { getCurrentOrgSlugClient } from "@/lib/tenant/client";
import { parseOrgSlugFromPathname } from "@/lib/tenant/path";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const organizations = data.organizations;
  const fallbackSlug = parseOrgSlugFromPathname(pathname) ?? organizations[0]?.slug ?? "summit";
  const [currentSlug, setCurrentSlug] = useState(fallbackSlug);
  useEffect(() => {
    const slugFromCookie = getCurrentOrgSlugClient(fallbackSlug);
    if (slugFromCookie !== currentSlug) setCurrentSlug(slugFromCookie);
  }, [fallbackSlug, currentSlug]);
  const currentOrganization = useMemo(
    () => organizations.find((entry) => entry.slug === currentSlug) ?? organizations[0],
    [organizations, currentSlug]
  );
  const { hasAnyPermission, hasPermission, activeStaff } = useWorkstationState();

  const canAccessPermissions = useCallback((permissions?: StaffPermission[]) => {
    if (!activeStaff) return true;
    if (!permissions || permissions.length === 0) return true;
    return hasAnyPermission(permissions);
  }, [activeStaff, hasAnyPermission]);

  return (
    <div className="min-h-screen bg-background">
      <DevPerfMonitor />
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[250px_1fr] lg:p-6">
        <aside className="rounded-xl border bg-card p-4 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Facility Ops</p>
          <h1 className="mt-1 text-lg font-semibold">{currentOrganization?.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{currentOrganization?.facilityType.replace("_", " ")}</p>
          <div className="mt-5">
            <SidebarNav
              pathname={pathname}
              currentOrgSlug={currentSlug}
              canAccessPermissions={canAccessPermissions}
              hasPermission={hasPermission}
            />
          </div>
        </aside>
        <main className="space-y-4">
          <TopBar />
          {children}
        </main>
      </div>
    </div>
  );
}
