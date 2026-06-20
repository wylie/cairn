"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CairnBrand } from "@/components/brand/cairn-brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileStaffNavigation } from "@/components/layout/mobile-staff-navigation";
import { TopBar } from "@/components/layout/top-bar";
import { DevPerfMonitor } from "@/components/dev/dev-perf-monitor";
import { Button } from "@/components/ui/button";
import { useRuntimeOrganizations } from "@/lib/platform-admin/use-runtime-organizations";
import { useIsMobileStaffLayout } from "@/lib/responsive/use-mobile";
import { useCustomerState } from "@/lib/state/customer-state";
import { useSupportState } from "@/lib/state/support-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type { StaffPermission } from "@/types/domain";
import { getCurrentOrgSlugClient } from "@/lib/tenant/client";
import { parseOrgSlugFromPathname } from "@/lib/tenant/path";
import { CAIRN_VERSION } from "@/lib/version";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const organizations = useRuntimeOrganizations();
  const routeSlug = parseOrgSlugFromPathname(pathname);
  const fallbackSlug = routeSlug ?? organizations[0]?.slug ?? "summit";
  const [currentSlug, setCurrentSlug] = useState(fallbackSlug);
  useEffect(() => {
    const slugFromCookie = routeSlug ?? getCurrentOrgSlugClient(fallbackSlug);
    if (slugFromCookie !== currentSlug) setCurrentSlug(slugFromCookie);
  }, [fallbackSlug, currentSlug, routeSlug]);
  const currentOrganization = useMemo(
    () => organizations.find((entry) => entry.slug === currentSlug) ?? organizations[0],
    [organizations, currentSlug]
  );
  const { hasAnyPermission, hasPermission, activeStaff, staffUsers } = useWorkstationState();
  const { createCommunication } = useCustomerState();
  const { activeImpersonationSession, endImpersonation, logSupportEvent, markImpersonationNotified, impersonationSessions } = useSupportState();
  const isMobileStaffLayout = useIsMobileStaffLayout();
  const supportPathLogRef = useRef<string | null>(null);

  const canAccessPermissions = useCallback((permissions?: StaffPermission[]) => {
    if (!activeStaff) return true;
    if (!permissions || permissions.length === 0) return true;
    return hasAnyPermission(permissions);
  }, [activeStaff, hasAnyPermission]);

  const mobileModeLabel = useMemo(() => {
    if (!activeStaff) return "Staff Mobile";
    if (hasPermission("manageSettings") || hasPermission("viewReports") || hasPermission("manageStaff")) return "Manager Mobile";
    if (hasPermission("editPrograms") && !hasPermission("usePOS")) return "Instructor Mobile";
    return "Front Desk Mobile";
  }, [activeStaff, hasPermission]);

  const currentSupportSession = useMemo(
    () => (activeImpersonationSession?.organizationSlug === currentSlug && activeImpersonationSession.status === "active" ? activeImpersonationSession : null),
    [activeImpersonationSession, currentSlug]
  );

  const notificationDeliveredAt = useMemo(
    () => impersonationSessions.find((entry) => entry.id === currentSupportSession?.id)?.notificationDeliveredAt,
    [impersonationSessions, currentSupportSession?.id]
  );

  useEffect(() => {
    if (!currentSupportSession) return;
    const dedupeKey = `cairn_support_notice_${currentSupportSession.id}`;
    if (notificationDeliveredAt || (typeof window !== "undefined" && window.sessionStorage.getItem(dedupeKey) === "sent")) return;

    const adminRecipients = staffUsers
      .filter((entry) => entry.role === "owner" || entry.role === "manager")
      .map((entry) => ({
        id: entry.id,
        type: "staff" as const,
        label: `${entry.firstName} ${entry.lastName}`,
        staffUserId: entry.id,
        email: entry.email,
        phone: entry.phone
      }));

    createCommunication({
      channel: "system_notification",
      status: "sent",
      deliveryStatus: "unread",
      recipientType: "staff",
      recipientLabel: "Facility administration",
      subject: `Cairn support session started for ${currentSupportSession.organizationName}`,
      message: `${currentSupportSession.supportStaffName} is assisting ${currentSupportSession.organizationName}. Reason: ${currentSupportSession.reason}.`,
      recipients: adminRecipients,
      source: "system_alert",
      isTransactional: true,
      createdByStaffName: "Cairn Support"
    });
    markImpersonationNotified(currentSupportSession.id);
    if (typeof window !== "undefined") window.sessionStorage.setItem(dedupeKey, "sent");
  }, [createCommunication, currentSupportSession, markImpersonationNotified, notificationDeliveredAt, staffUsers]);

  useEffect(() => {
    if (!currentSupportSession) return;
    const facilityAccessKey = `${currentSupportSession.id}:${pathname}`;
    if (supportPathLogRef.current === facilityAccessKey) return;
    supportPathLogRef.current = facilityAccessKey;
    logSupportEvent({
      supportStaffId: currentSupportSession.supportStaffId,
      supportStaffName: currentSupportSession.supportStaffName,
      supportStaffEmail: currentSupportSession.supportStaffEmail,
      organizationSlug: currentSupportSession.organizationSlug,
      organizationName: currentSupportSession.organizationName,
      facilityName: currentSupportSession.facilityName,
      actionTaken: "facility_access",
      reasonProvided: currentSupportSession.reason,
      metadata: { pathname }
    });
  }, [currentSupportSession, logSupportEvent, pathname]);

  return (
    <div className="min-h-screen bg-background">
      <DevPerfMonitor />
      <div className="mx-auto grid w-full max-w-[1680px] grid-cols-1 gap-6 px-4 py-4 pb-32 lg:grid-cols-[272px_minmax(0,1fr)] lg:px-6 lg:py-6 lg:pb-6">
        <aside className="hidden rounded-xl border bg-card p-4 lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden">
          <div className="shrink-0">
            <div className="flex items-center gap-3">
              <CairnBrand className="h-10 w-10" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Facility Ops</p>
                <h1 className="text-lg font-semibold">{currentOrganization?.name}</h1>
              </div>
            </div>
          </div>
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
            <SidebarNav
              pathname={pathname}
              currentOrgSlug={currentSlug}
              canAccessPermissions={canAccessPermissions}
              hasPermission={hasPermission}
            />
          </div>
          <div className="mt-4 shrink-0 border-t pt-3 text-xs text-muted-foreground">
            <Link href={`/o/${currentSlug}/release-notes`} className="font-medium text-foreground hover:text-primary">
              What's New
            </Link>
            <span className="mx-2">·</span>
            <span>Cairn v{CAIRN_VERSION}</span>
          </div>
        </aside>
        <main className="space-y-4">
          {currentSupportSession ? (
            <div className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-amber-950">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber-900">Support Mode</p>
                  <p className="font-semibold">You are currently assisting {currentSupportSession.organizationName}.</p>
                  <p className="text-sm text-amber-900">Reason: {currentSupportSession.reason}. All support activity is logged and visible to the facility.</p>
                </div>
                <Button
                  type="button"
                  variant="caution"
                  onClick={() => {
                    endImpersonation("Support session ended by support staff.");
                    window.location.assign("/admin/support");
                  }}
                >
                  End Session
                </Button>
              </div>
            </div>
          ) : null}
          {isMobileStaffLayout ? (
            <div className="rounded-xl border bg-card px-4 py-3 lg:hidden" data-testid="mobile-staff-mode-banner">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Mobile Staff Mode</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{mobileModeLabel}</p>
                  <p className="text-sm text-muted-foreground">Optimized for one-handed workflows, larger touch targets, and faster navigation.</p>
                </div>
              </div>
            </div>
          ) : null}
          <TopBar />
          {children}
        </main>
      </div>
      {isMobileStaffLayout ? (
        <MobileStaffNavigation
          pathname={pathname}
          currentOrgSlug={currentSlug}
          canAccessPermissions={canAccessPermissions}
          hasPermission={hasPermission}
        />
      ) : null}
    </div>
  );
}
