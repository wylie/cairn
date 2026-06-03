"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useCustomerState } from "@/lib/state/customer-state";
import { useSettingsState } from "@/lib/state/settings-state";
import { ActiveStaffIndicator } from "@/components/staff/active-staff-indicator";
import { data } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { getAllowedOrgSlugsFromSessionCookie, getCurrentOrgSlugClient } from "@/lib/tenant/client";
import { parseOrgSlugFromPathname } from "@/lib/tenant/path";

function TopBarInner() {
  const pathname = usePathname() ?? "";
  const organizations = data.organizations;
  const fallbackSlug = parseOrgSlugFromPathname(pathname) ?? organizations[0]?.slug ?? "summit";
  const [currentSlug, setCurrentSlug] = useState(fallbackSlug);
  const [allowedOrgSlugs, setAllowedOrgSlugs] = useState<string[]>(organizations.map((entry) => entry.slug));
  useEffect(() => {
    const cookieSlug = getCurrentOrgSlugClient(fallbackSlug);
    if (cookieSlug !== currentSlug) setCurrentSlug(cookieSlug);
    const allowed = getAllowedOrgSlugsFromSessionCookie();
    if (allowed?.length) setAllowedOrgSlugs(allowed);
  }, [fallbackSlug, currentSlug]);
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
    const unreadMessages = communications
      .filter((entry) => entry.channel === "system_notification" && entry.deliveryStatus !== "read")
      .slice(0, 4)
      .map((entry) => ({
        id: entry.id,
        title: entry.subject,
        detail: entry.message,
        kind: "notification" as const,
        occurredAt: entry.sentAt ?? entry.createdAt
      }));
    const openAlerts = operationsAlerts
      .filter((entry) => entry.status === "open")
      .slice(0, 3)
      .map((entry) => ({
        id: `alert-${entry.id}`,
        title: entry.title,
        detail: entry.description ?? "Operational alert",
        kind: "alert" as const,
        occurredAt: entry.createdAt
      }));
    const openTasks = operationsTasks
      .filter((entry) => entry.status === "open" || entry.status === "in_progress")
      .slice(0, 3)
      .map((entry) => ({
        id: `task-${entry.id}`,
        title: entry.title,
        detail: entry.description ?? "Staff task",
        kind: "task" as const,
        occurredAt: entry.createdAt
      }));
    return [...unreadMessages, ...openAlerts, ...openTasks].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [communications, operationsAlerts, operationsTasks]);
  const unreadNotificationCount = communications.filter(
    (entry) => entry.channel === "system_notification" && entry.deliveryStatus !== "read"
  ).length;

  const handleSignOut = async () => {
    await fetch("/api/auth/mock-logout", { method: "POST" });
    window.location.assign("/login");
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
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
          className="rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {occupancyCount} currently in
        </Link>
        {selectableOrgs.length > 1 ? (
          <select
            aria-label="Switch organization"
            className="h-10 rounded-md border bg-background px-2 text-sm"
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
            onClick={() => {
              setNotificationsOpen((prev) => !prev);
              communications
                .filter((entry) => entry.channel === "system_notification" && entry.deliveryStatus !== "read")
                .slice(0, 4)
                .forEach((entry) => {
                  markCommunicationRead(entry.id);
                });
            }}
            className="relative"
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
                <p className="text-sm font-semibold">Notifications</p>
                <span className="text-xs text-muted-foreground">{notificationItems.length} items</span>
              </div>
              <div className="space-y-2">
                {notificationItems.length === 0 ? <p className="text-sm text-muted-foreground">No new notifications.</p> : null}
                {notificationItems.map((item) => (
                  <div key={item.id} className="rounded-lg border p-2 text-sm">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <Button type="button" variant="outline" onClick={handleSignOut}>Sign out</Button>
        <ActiveStaffIndicator />
      </div>
    </header>
  );
}

export const TopBar = memo(TopBarInner);
