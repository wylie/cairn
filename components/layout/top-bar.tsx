"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useCustomerState } from "@/lib/state/customer-state";
import { useSettingsState } from "@/lib/state/settings-state";
import { ActiveStaffIndicator } from "@/components/staff/active-staff-indicator";
import { TOP_BAR_UTILITY_CONTROL_CLASS } from "@/components/layout/utility-header";
import { useRuntimeOrganizations } from "@/lib/platform-admin/use-runtime-organizations";
import { Button } from "@/components/ui/button";
import { getAllowedOrgSlugsFromSessionCookie, getCurrentOrgSlugClient } from "@/lib/tenant/client";
import { getStaffLoginPath, parseOrgSlugFromPathname } from "@/lib/tenant/path";
import { cn } from "@/lib/utils";

type TopBarNotificationItem = {
  id: string;
  title: string;
  detail: string;
  kind: "notification" | "alert" | "task";
  occurredAt: string;
  isUnread: boolean;
  communicationId?: string;
};

export function sortTopBarNotificationItems(a: TopBarNotificationItem, b: TopBarNotificationItem) {
  if (a.isUnread !== b.isUnread) return a.isUnread ? -1 : 1;
  return b.occurredAt.localeCompare(a.occurredAt);
}

function TopBarInner() {
  const pathname = usePathname() ?? "";
  const organizations = useRuntimeOrganizations();
  const routeSlug = parseOrgSlugFromPathname(pathname);
  const fallbackSlug = routeSlug ?? organizations[0]?.slug ?? "summit";
  const [currentSlug, setCurrentSlug] = useState(fallbackSlug);
  const [allowedOrgSlugs, setAllowedOrgSlugs] = useState<string[]>([fallbackSlug]);
  useEffect(() => {
    const cookieSlug = routeSlug ?? getCurrentOrgSlugClient(fallbackSlug);
    if (cookieSlug !== currentSlug) setCurrentSlug(cookieSlug);
    const allowed = getAllowedOrgSlugsFromSessionCookie();
    if (allowed?.length) setAllowedOrgSlugs(allowed);
  }, [fallbackSlug, currentSlug, routeSlug]);
  const selectableOrgs = useMemo(
    () => organizations.filter((entry) => allowedOrgSlugs.includes(entry.slug)),
    [organizations, allowedOrgSlugs]
  );
  const org = useMemo(
    () => selectableOrgs.find((entry) => entry.slug === currentSlug) ?? selectableOrgs[0] ?? organizations[0],
    [selectableOrgs, currentSlug, organizations]
  );
  const { settings, activeLocationId } = useSettingsState();
  const location =
    settings.locations.find((entry) => entry.id === activeLocationId) ??
    settings.locations.find((entry) => entry.isDefault) ??
    settings.locations[0];
  const { occupancyCount, communications, operationsAlerts, operationsTasks, markCommunicationRead } = useCustomerState();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const suffixPath = useMemo(
    () => (pathname.startsWith(`/o/${currentSlug}`) ? pathname.replace(`/o/${currentSlug}`, "") || "/dashboard" : "/dashboard"),
    [pathname, currentSlug]
  );
  const notificationItems = useMemo(() => {
    const messages = communications
      .filter((entry) => ["system_notification", "in_app_notification"].includes(entry.channel))
      .slice(0, 6)
      .map((entry) => ({
        id: entry.id,
        title: entry.subject,
        detail: entry.message,
        kind: "notification" as const,
        occurredAt: entry.sentAt ?? entry.createdAt,
        isUnread: entry.deliveryStatus !== "read",
        communicationId: entry.id
      }));
    const openAlerts = operationsAlerts
      .filter((entry) => entry.status === "open")
      .slice(0, 3)
      .map((entry) => ({
        id: `alert-${entry.id}`,
        title: entry.title,
        detail: entry.description ?? "Operational alert",
        kind: "alert" as const,
        occurredAt: entry.createdAt,
        isUnread: false,
        communicationId: undefined
      }));
    const openTasks = operationsTasks
      .filter((entry) => entry.status === "open" || entry.status === "in_progress")
      .slice(0, 3)
      .map((entry) => ({
        id: `task-${entry.id}`,
        title: entry.title,
        detail: entry.description ?? "Staff task",
        kind: "task" as const,
        occurredAt: entry.createdAt,
        isUnread: false,
        communicationId: undefined
      }));
    return [...messages, ...openAlerts, ...openTasks].sort(sortTopBarNotificationItems);
  }, [communications, operationsAlerts, operationsTasks]);
  const unreadNotificationCount = communications.filter(
    (entry) => ["system_notification", "in_app_notification"].includes(entry.channel) && entry.deliveryStatus !== "read"
  ).length;

  const handleSignOut = async () => {
    await fetch("/api/auth/mock-logout", { method: "POST" });
    window.location.assign(getStaffLoginPath(pathname, currentSlug));
  };

  return (
    <header className="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card/95 p-6 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Organization</p>
        <p className="font-semibold">{org?.name ?? "Unknown Organization"}</p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Location</p>
        <p className="font-semibold">{location?.name ?? "Unknown Location"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/o/${currentSlug}/check-in`}
          prefetch
          aria-label="View current check-ins"
          data-testid="header-occupancy"
          className={TOP_BAR_UTILITY_CONTROL_CLASS}
        >
          {occupancyCount} currently in
        </Link>
        {selectableOrgs.length > 1 ? (
          <select
            aria-label="Switch organization"
            className="h-12 rounded-lg border bg-background px-3 text-sm text-foreground shadow-sm"
            value={currentSlug}
            onChange={(event) => window.location.assign(`/o/${event.target.value}${suffixPath}`)}
          >
            {selectableOrgs.map((entry) => (
              <option key={entry.id} value={entry.slug}>{entry.name}</option>
            ))}
          </select>
        ) : null}
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            aria-label="Open notifications"
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className="relative h-12 min-h-12 rounded-lg px-4"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadNotificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {unreadNotificationCount}
              </span>
            ) : null}
          </Button>
          {notificationsOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border bg-card p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted-foreground">{unreadNotificationCount} unread</p>
                </div>
                {unreadNotificationCount > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      communications
                        .filter((entry) => ["system_notification", "in_app_notification"].includes(entry.channel) && entry.deliveryStatus !== "read")
                        .forEach((entry) => markCommunicationRead(entry.id));
                    }}
                  >
                    Mark all read
                  </Button>
                ) : null}
              </div>
              <div className="space-y-2">
                {notificationItems.length === 0 ? (
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-sm font-semibold">You're all caught up.</p>
                    <p className="text-sm text-muted-foreground">New notifications will appear here when they need your attention.</p>
                  </div>
                ) : null}
                {notificationItems.map((item) => (
                  <div
                    key={item.id}
                    data-read-state={item.isUnread ? "unread" : "read"}
                    className={cn(
                      "rounded-lg border p-3 text-sm transition-colors",
                      item.isUnread ? "border-sky-200 bg-sky-50" : "bg-muted/20 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {item.isUnread ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
                        <p className={cn("truncate", item.isUnread ? "font-semibold text-foreground" : "font-medium")}>{item.title}</p>
                      </div>
                      {item.isUnread && item.communicationId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-xs"
                          onClick={() => markCommunicationRead(item.communicationId!)}
                          aria-label={`Mark ${item.title} as read`}
                        >
                          Mark read
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <Button type="button" variant="outline" onClick={handleSignOut} className="h-12 rounded-lg px-4">Sign out</Button>
        <ActiveStaffIndicator />
      </div>
    </header>
  );
}

export const TopBar = memo(TopBarInner);
