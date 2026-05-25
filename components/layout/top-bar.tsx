"use client";

import Link from "next/link";
import { useCustomerState } from "@/lib/state/customer-state";
import { useSettingsState } from "@/lib/state/settings-state";
import { ActiveStaffIndicator } from "@/components/staff/active-staff-indicator";

export function TopBar() {
  const { settings, activeLocationId } = useSettingsState();
  const location =
    settings.locations.find((entry) => entry.id === activeLocationId) ??
    settings.locations.find((entry) => entry.isDefault) ??
    settings.locations[0];
  const { occupancyCount } = useCustomerState();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Location</p>
        <p className="font-semibold">{location?.name ?? "Unknown Location"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/check-in"
          prefetch
          aria-label="View current check-ins"
          data-testid="header-occupancy"
          className="rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {occupancyCount} currently in
        </Link>
        <ActiveStaffIndicator />
      </div>
    </header>
  );
}
