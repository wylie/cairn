"use client";

import { data } from "@/lib/data";
import { useCustomerState } from "@/lib/state/customer-state";

export function TopBar() {
  const location = data.locations[0];
  const { occupancyCount } = useCustomerState();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Location</p>
        <p className="font-semibold">{location.name}</p>
      </div>
      <div data-testid="header-occupancy" className="rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">
        {occupancyCount} currently in
      </div>
    </header>
  );
}
