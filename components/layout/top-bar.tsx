"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCustomerState } from "@/lib/state/customer-state";
import { useSettingsState } from "@/lib/state/settings-state";
import { ActiveStaffIndicator } from "@/components/staff/active-staff-indicator";
import { data } from "@/lib/data";
import { Button } from "@/components/ui/button";

function decodeAllowedOrgSlugsFromCookie(): string[] | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("cairn_mock_auth="))
    ?.split("=")[1];
  if (!raw) return null;
  try {
    const json = atob(raw.replaceAll("-", "+").replaceAll("_", "/"));
    const parsed = JSON.parse(json) as { organizationSlugs?: string[] };
    return Array.isArray(parsed.organizationSlugs) ? parsed.organizationSlugs : null;
  } catch {
    return null;
  }
}

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const organizations = data.organizations;
  const currentSlug = pathname.match(/^\/o\/([^/]+)/)?.[1] ?? organizations[0]?.slug ?? "summit";
  const allowedOrgSlugs = decodeAllowedOrgSlugsFromCookie() ?? organizations.map((entry) => entry.slug);
  const selectableOrgs = organizations.filter((entry) => allowedOrgSlugs.includes(entry.slug));
  const org = selectableOrgs.find((entry) => entry.slug === currentSlug) ?? selectableOrgs[0] ?? organizations[0];
  const { settings, activeLocationId } = useSettingsState();
  const location =
    settings.locations.find((entry) => entry.id === activeLocationId) ??
    settings.locations.find((entry) => entry.isDefault) ??
    settings.locations[0];
  const { occupancyCount } = useCustomerState();
  const suffixPath = pathname.startsWith(`/o/${currentSlug}`) ? pathname.replace(`/o/${currentSlug}`, "") || "/dashboard" : pathname;

  const handleSignOut = async () => {
    await fetch("/api/auth/mock-logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
            onChange={(event) => router.push(`/o/${event.target.value}${suffixPath}`)}
          >
            {selectableOrgs.map((entry) => (
              <option key={entry.id} value={entry.slug}>{entry.name}</option>
            ))}
          </select>
        ) : null}
        <Button type="button" variant="outline" onClick={handleSignOut}>Sign out</Button>
        <ActiveStaffIndicator />
      </div>
    </header>
  );
}
